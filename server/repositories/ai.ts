import { GoogleGenAI } from "@google/genai";
import {
  Database,
  errorMessage,
  isRecord,
  uniqueStrings,
} from "./database";
import {
  AgentConfig,
  SessionRecord,
  StructuredDraft,
  StructuredRisk,
  TranscriptItem,
  StoredAgent,
  StoredSession,
} from "../../types";
import { metrics } from "../middleware/common";
import { deliverSession } from "./integrations";

const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 15000);

export function hasStructuredDraft(draft: StructuredDraft) {
  return Boolean(draft.extracted.length || draft.triggeredRisks.length || draft.requiredMissing?.length);
}

function normalizeForMatch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function keywordMatches(answer: string, keyword: string) {
  const normalizedAnswer = normalizeForMatch(answer);
  const normalizedKeyword = normalizeForMatch(keyword).trim();
  if (!normalizedKeyword) return false;
  if (/^\d+$/.test(normalizedKeyword)) {
    return normalizedAnswer.split(/\D+/).includes(normalizedKeyword);
  }
  return normalizedAnswer.includes(normalizedKeyword);
}

export function detectStructuredRisk(question: AgentConfig["questions"][number], answer: string): StructuredRisk | null {
  const keyword = (question.riskKeywords || []).find((item) => keywordMatches(answer, item));
  if (!keyword) return null;
  return {
    questionId: question.id,
    question: question.text,
    keyword,
    answer,
    detectedAt: new Date().toISOString(),
  };
}

export function applyAnswerToDraft(draft: StructuredDraft, question: AgentConfig["questions"][number], answer: string, risk: StructuredRisk | null): StructuredDraft {
  const label = question.collectAs?.trim();
  const extracted = label
    ? [
        ...draft.extracted.filter((item) => item.label.toLowerCase() !== label.toLowerCase()),
        { label, value: answer },
      ]
    : draft.extracted;

  const triggeredRisks = risk && !draft.triggeredRisks.some((item) => item.questionId === risk.questionId && item.keyword === risk.keyword)
    ? [...draft.triggeredRisks, risk]
    : draft.triggeredRisks;

  return {
    extracted,
    triggeredRisks,
    requiredMissing: draft.requiredMissing || [],
  };
}

export function getRequiredMissing(agent: StoredAgent, draft: StructuredDraft) {
  const collected = new Set(draft.extracted.map((item) => item.label.toLowerCase()));
  return agent.questions
    .filter((question) => question.required && question.collectAs && !collected.has(question.collectAs.toLowerCase()))
    .map((question) => question.collectAs!);
}

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first < 0 || last < first) {
    throw new Error("A IA não retornou JSON estruturado.");
  }
  return JSON.parse(raw.slice(first, last + 1));
}

function transcriptToText(items: Array<{ role: "agent" | "user"; text: string }>) {
  return items
    .map((item) => `${item.role === "agent" ? "Agente" : "Usuário"}: ${item.text}`)
    .join("\n");
}

type AnalysisResult = Pick<SessionRecord, "summary" | "sentiment" | "riskLevel" | "score" | "tags" | "followUp" | "extracted">;

function mergeStructuredFindings(analysis: AnalysisResult, draft: StructuredDraft): AnalysisResult {
  const extracted: AnalysisResult["extracted"] = [];
  const seenLabels = new Set<string>();
  const addExtracted = (item: { label: string; value: string }) => {
    const label = String(item.label || "").trim();
    const value = String(item.value || "").trim();
    const key = label.toLowerCase();
    if (!label || !value || seenLabels.has(key)) return;
    seenLabels.add(key);
    extracted.push({ label, value });
  };

  draft.extracted.forEach(addExtracted);
  analysis.extracted.forEach(addExtracted);

  const riskKeywords = uniqueStrings(draft.triggeredRisks.map((risk) => risk.keyword));
  const missingFields = uniqueStrings(draft.requiredMissing || []);
  const tags = uniqueStrings([
    ...analysis.tags,
    ...riskKeywords.map((keyword) => `risco:${keyword}`),
    ...(draft.triggeredRisks.length ? ["risco-detectado", "escalacao-humana"] : []),
    ...(missingFields.length ? ["campos-pendentes"] : []),
  ]).slice(0, 12);

  let riskLevel = analysis.riskLevel;
  let score = analysis.score;
  let followUp = analysis.followUp;

  if (draft.triggeredRisks.length) {
    riskLevel = "Alto";
    score = Math.min(score, 45);
    followUp = `Escalar para atendimento humano com prioridade alta. Sinais detectados: ${riskKeywords.join(", ")}.`;
  } else if (missingFields.length) {
    score = Math.min(score, 75);
    followUp = `Completar campos obrigatórios pendentes: ${missingFields.join(", ")}.`;
  }

  return {
    ...analysis,
    riskLevel,
    score,
    tags,
    followUp,
    extracted,
  };
}

function buildDeterministicAnalysis(agent: StoredAgent, transcript: string, durationSeconds: number, draft: StructuredDraft): AnalysisResult {
  const riskKeywords = uniqueStrings(draft.triggeredRisks.map((risk) => risk.keyword));
  const missingFields = uniqueStrings(draft.requiredMissing || []);
  const hasRisk = draft.triggeredRisks.length > 0;
  const hasMissingFields = missingFields.length > 0;

  return {
    summary: hasRisk
      ? `Conversa registrada pelo roteiro "${agent.name}" com sinal de risco detectado e necessidade de escalação humana.`
      : `Conversa registrada pelo roteiro "${agent.name}" com ${draft.extracted.length} campo(s) estruturado(s) coletado(s) em ${durationSeconds} segundo(s).`,
    sentiment: "Neutro",
    riskLevel: hasRisk ? "Alto" : hasMissingFields ? "Moderado" : "Baixo",
    score: hasRisk ? 35 : hasMissingFields ? 65 : Math.min(95, 70 + draft.extracted.length * 5),
    tags: uniqueStrings([
      "roteiro-estruturado",
      ...(hasRisk ? ["risco-detectado", "escalacao-humana"] : []),
      ...(hasMissingFields ? ["campos-pendentes"] : []),
      ...riskKeywords.map((keyword) => `risco:${keyword}`),
    ]).slice(0, 12),
    followUp: hasRisk
      ? `Escalar para atendimento humano com prioridade alta. Sinais detectados: ${riskKeywords.join(", ")}.`
      : hasMissingFields
        ? `Completar campos obrigatórios pendentes: ${missingFields.join(", ")}.`
        : "Revisar registro estruturado e seguir o fluxo operacional definido.",
    extracted: draft.extracted,
  };
}

export async function analyzeTranscript(agent: StoredAgent & { ownerId: string }, transcript: string, durationSeconds: number, draft: StructuredDraft) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não configurada. A análise inteligente e extração estruturada dependem dessa chave.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Analise a transcrição de uma conversa conduzida por agente de voz.

Agente:
${JSON.stringify({
    name: agent.name,
    template: agent.template,
    description: agent.description,
    analysisPrompt: agent.analysisPrompt,
    questions: agent.questions,
  }, null, 2)}

Transcrição:
${transcript}

Achados determinísticos coletados pelo roteiro:
${JSON.stringify(draft, null, 2)}

Duração aproximada em segundos: ${durationSeconds}

Regras obrigatórias:
- Preserve os campos estruturados já coletados quando fizer sentido.
- Se houver triggeredRisks, classifique riskLevel como Alto e recomende escalação humana.
- Não invente campos, diagnósticos, integrações ou ações já concluídas.

Retorne somente JSON válido, sem markdown, no formato:
{
  "summary": "resumo objetivo da conversa",
  "sentiment": "Positivo | Neutro | Negativo",
  "riskLevel": "Baixo | Moderado | Alto",
  "score": 0,
  "tags": ["tag1", "tag2"],
  "followUp": "próxima ação clara",
  "extracted": [{"label": "campo", "value": "valor"}]
}`;

  const response = await Promise.race([
    ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    }),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout ao analisar transcrição com Gemini.")), AI_TIMEOUT_MS)),
  ]);

  const parsed = extractJson(response.text || "{}");
  return {
    summary: String(parsed.summary || "Conversa concluída."),
    sentiment: parsed.sentiment === "Negativo" || parsed.sentiment === "Neutro" ? parsed.sentiment : "Positivo",
    riskLevel: parsed.riskLevel === "Alto" || parsed.riskLevel === "Moderado" ? parsed.riskLevel : "Baixo",
    score: Math.max(0, Math.min(100, Number(parsed.score ?? 80))),
    tags: Array.isArray(parsed.tags) ? parsed.tags.map(String).slice(0, 8) : [],
    followUp: String(parsed.followUp || "Revisar resultado e definir próxima ação."),
    extracted: Array.isArray(parsed.extracted)
      ? parsed.extracted
          .map((item: unknown) => {
            const record = isRecord(item) ? item : {};
            return { label: String(record.label || ""), value: String(record.value || "") };
          })
          .filter((item) => item.label)
      : [],
  };
}

export async function createSessionFromConversation(params: {
  data: Database;
  ownerId: string;
  agent: StoredAgent & { ownerId: string };
  caller: string;
  transcriptItems: TranscriptItem[];
  durationSeconds: number;
  structuredDraft: StructuredDraft;
  audioUrl?: string;
}) {
  const { data, ownerId, agent, caller, transcriptItems, durationSeconds, audioUrl } = params;
  const structuredDraft = {
    ...params.structuredDraft,
    requiredMissing: getRequiredMissing(agent, params.structuredDraft),
  };
  const transcript = transcriptToText(transcriptItems);
  let baseAnalysis: AnalysisResult;
  if (process.env.GEMINI_API_KEY) {
    try {
      baseAnalysis = await analyzeTranscript(agent, transcript, durationSeconds, structuredDraft);
    } catch (error) {
      metrics.geminiFailures += 1;
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "error",
        message: "gemini_analysis_failed",
        tenant_id: ownerId,
        error: errorMessage(error),
      }));
      baseAnalysis = buildDeterministicAnalysis(agent, transcript, durationSeconds, structuredDraft);
    }
  } else {
    baseAnalysis = buildDeterministicAnalysis(agent, transcript, durationSeconds, structuredDraft);
  }
  const analysis = mergeStructuredFindings(baseAnalysis, structuredDraft);
  const now = new Date().toISOString();
  const totalSeconds = Math.max(0, Math.round(durationSeconds));
  const session: SessionRecord = {
    id: `SES-${Date.now()}`,
    agentName: agent.name,
    caller: caller || "Contato não informado",
    dateTime: now.slice(0, 16).replace("T", " "),
    duration: `${Math.floor(totalSeconds / 60).toString().padStart(2, "0")}:${(totalSeconds % 60).toString().padStart(2, "0")}`,
    transcript,
    structuredDraft: hasStructuredDraft(structuredDraft) ? structuredDraft : undefined,
    audioUrl,
    ...analysis,
  };

  session.integrationDelivery = await deliverSession(data, ownerId, session);

  const storedSession: StoredSession = {
    ...session,
    ownerId,
    createdAt: now,
  };

  data.sessions.push(storedSession);
  const { ownerId: _ownerId, createdAt: _createdAt, ...publicSession } = storedSession;
  return publicSession;
}
