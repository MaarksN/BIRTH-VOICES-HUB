import { Router } from "express";
import {
  AuthedRequest,
  readDatabase,
  requireFields,
  writeDatabase,
  isRecord,
  normalizeStructuredDraft,
} from "../repositories/database";
import { requireAuth, requirePermission } from "../middleware/auth";
import { SessionRecord, StoredSession } from "../../types";
import { deliverSession } from "../repositories/integrations";
import { createSessionFromConversation } from "../repositories/ai";

const router = Router();

function validateSession(body: Partial<SessionRecord>) {
  requireFields(body as Record<string, unknown>, ["agentName", "caller", "duration", "summary", "transcript"]);
  const now = new Date().toISOString();

  return {
    id: String(body.id || `SES-${Date.now()}`),
    agentName: String(body.agentName),
    caller: String(body.caller),
    dateTime: String(body.dateTime || now.slice(0, 16).replace("T", " ")),
    duration: String(body.duration),
    sentiment: body.sentiment === "Negativo" || body.sentiment === "Neutro" ? body.sentiment : "Positivo",
    riskLevel: body.riskLevel === "Alto" || body.riskLevel === "Moderado" ? body.riskLevel : "Baixo",
    score: Math.max(0, Math.min(100, Number(body.score ?? 80))),
    summary: String(body.summary),
    transcript: String(body.transcript),
    tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
    followUp: String(body.followUp || "Revisar e definir próxima ação."),
    extracted: Array.isArray(body.extracted)
      ? body.extracted.map((item: unknown) => {
          const record = isRecord(item) ? item : {};
          return { label: String(record.label || ""), value: String(record.value || "") };
        })
      : [],
    structuredDraft: body.structuredDraft ? normalizeStructuredDraft(body.structuredDraft) : undefined,
    integrationDelivery: body.integrationDelivery,
    audioUrl: body.audioUrl ? String(body.audioUrl) : undefined,
  } as SessionRecord;
}

router.get("/", requireAuth, (req: AuthedRequest, res) => {
    const sessions = (req.data?.sessions || [])
      .filter((session) => session.ownerId === req.tenantId)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .map(({ ownerId: _ownerId, createdAt: _createdAt, ...session }) => session);
    res.json({ sessions });
});

router.post("/", requireAuth, requirePermission("session:write"), async (req: AuthedRequest, res, next) => {
    try {
      const data = req.data || await readDatabase();
      const session = validateSession(req.body);
      session.integrationDelivery = await deliverSession(data, req.tenantId!, session);
      const storedSession: StoredSession = {
        ...session,
        ownerId: req.tenantId!,
        createdAt: new Date().toISOString(),
      };

      data.sessions.push(storedSession);
      await writeDatabase(data);
      const { ownerId: _ownerId, createdAt: _createdAt, ...publicSession } = storedSession;
      res.status(201).json({ session: publicSession });
    } catch (error) {
      next(error);
    }
});

router.post("/analyze-and-save", requireAuth, requirePermission("session:write"), async (req: AuthedRequest, res, next) => {
    try {
      const data = req.data || await readDatabase();
      const agent = data.agents.find((item) => item.id === req.body.agentId && item.ownerId === req.tenantId);

      if (!agent) {
        return res.status(404).json({ error: "Agente não encontrado." });
      }

      if (!Array.isArray(req.body.transcriptItems) || req.body.transcriptItems.length === 0) {
        return res.status(400).json({ error: "Transcrição vazia. Conduza uma conversa antes de salvar." });
      }

      const durationSeconds = Number(req.body.durationSeconds || 0);
      const structuredDraft = normalizeStructuredDraft(req.body.structuredDraft);
      const session = await createSessionFromConversation({
        data,
        ownerId: req.tenantId!,
        agent,
        caller: String(req.body.caller || "Contato não informado"),
        transcriptItems: req.body.transcriptItems,
        durationSeconds,
        structuredDraft,
      });
      await writeDatabase(data);
      res.status(201).json({ session });
    } catch (error) {
      next(error);
    }
});

export { router as sessionsRouter };
