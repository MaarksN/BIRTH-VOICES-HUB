import crypto from "crypto";
import { Router, Request, Response } from "express";
import {
  AuthedRequest,
  readDatabase,
  writeDatabase,
  errorMessage,
  StoredTelephonyCall,
  Database,
  isNodeError,
} from "../repositories/database";
import { requireAuth, requirePermission, requireTwilioSignature } from "../middleware/auth";
import { TelephonyCallStatus, TelephonyCall, StoredAgent } from "../../types";
import { metrics } from "../middleware/common";
import { createSessionFromConversation, detectStructuredRisk, applyAnswerToDraft } from "../repositories/ai";
import { normalizeStructuredDraft } from "../repositories/database";

const router = Router();

function publicTelephonyCall(call: StoredTelephonyCall): TelephonyCall {
  const { ownerId: _ownerId, ...publicCall } = call;
  return publicCall;
}

function getPublicBaseUrl() {
  return String(process.env.PUBLIC_BASE_URL || "").trim().replace(/\/+$/, "");
}

export function telephonyConfig() {
  const accountSid = String(process.env.TWILIO_ACCOUNT_SID || "").trim();
  const authToken = String(process.env.TWILIO_AUTH_TOKEN || "").trim();
  const from = String(process.env.TWILIO_FROM_NUMBER || "").trim();
  const publicBaseUrl = getPublicBaseUrl();
  const missing = [
    !accountSid && "TWILIO_ACCOUNT_SID",
    !authToken && "TWILIO_AUTH_TOKEN",
    !from && "TWILIO_FROM_NUMBER",
    !publicBaseUrl && "PUBLIC_BASE_URL",
  ].filter(Boolean) as string[];

  return {
    accountSid,
    authToken,
    from,
    publicBaseUrl,
    missing,
    providerConfigured: Boolean(accountSid && authToken),
    outboundConfigured: missing.length === 0,
  };
}

function validatePhoneNumber(value: unknown) {
  const phone = String(value || "").trim();
  if (!/^\+?[1-9]\d{7,14}$/.test(phone.replace(/[\s().-]/g, ""))) {
    throw new Error("Informe um telefone real em formato internacional. Exemplo: +5511999999999.");
  }
  return phone.replace(/[\s().-]/g, "");
}

async function twilioCreateCall(to: string, from: string, voiceUrl: string, statusUrl: string) {
  const { accountSid, authToken } = telephonyConfig();
  const body = new URLSearchParams();
  body.set("To", to);
  body.set("From", from);
  body.set("Url", voiceUrl);
  body.set("Method", "POST");
  body.set("StatusCallback", statusUrl);
  body.append("StatusCallbackEvent", "initiated");
  body.append("StatusCallbackEvent", "ringing");
  body.append("StatusCallbackEvent", "answered");
  body.append("StatusCallbackEvent", "completed");
  body.set("StatusCallbackMethod", "POST");

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || "Falha ao iniciar chamada na Twilio.");
  }

  return payload;
}

function mapTwilioStatus(value: unknown): TelephonyCallStatus {
  const status = String(value || "").toLowerCase();
  if (status === "ringing") return "ringing";
  if (status === "in-progress" || status === "answered") return "in-progress";
  if (status === "completed") return "completed";
  if (["busy", "failed", "no-answer", "canceled"].includes(status)) return "failed";
  return "queued";
}

function escapeXml(value: string) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function twiml(inner: string) {
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`;
}

function say(text: string) {
  return `<Say language="pt-BR" voice="alice">${escapeXml(text)}</Say>`;
}

function redirect(url: string) {
  return `<Redirect method="POST">${escapeXml(url)}</Redirect>`;
}

function gatherSpeech(actionUrl: string, prompt: string, retryUrl: string) {
  return `<Gather input="speech" action="${escapeXml(actionUrl)}" method="POST" language="pt-BR" speechTimeout="auto">${say(prompt)}</Gather>${say("Não consegui ouvir sua resposta. Vou repetir a pergunta.")}${redirect(retryUrl)}`;
}

async function finalizeTelephonyCall(data: Database, call: StoredTelephonyCall, agent: StoredAgent & { ownerId: string }) {
  if (call.sessionId) {
    const existing = data.sessions.find((session) => session.id === call.sessionId && session.ownerId === call.ownerId);
    if (existing) {
      const { ownerId: _ownerId, createdAt: _createdAt, ...publicSession } = existing;
      return publicSession;
    }
  }

  const completedAt = new Date().toISOString();
  const startedAt = Date.parse(call.startedAt) || Date.now();
  const durationSeconds = Math.max(1, Math.round((Date.parse(completedAt) - startedAt) / 1000));
  const session = await createSessionFromConversation({
    data,
    ownerId: call.ownerId,
    agent,
    caller: call.caller || call.to,
    transcriptItems: call.transcriptItems,
    durationSeconds,
    structuredDraft: normalizeStructuredDraft(call.structuredDraft),
  });

  call.sessionId = session.id;
  call.status = "completed";
  call.completedAt = completedAt;
  call.updatedAt = completedAt;
  return session;
}

router.get("/calls", requireAuth, (req: AuthedRequest, res) => {
    const calls = (req.data?.telephonyCalls || [])
      .filter((call) => call.ownerId === req.tenantId)
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .map(publicTelephonyCall);
    res.json({ calls });
});

router.post("/calls", requireAuth, requirePermission("telephony:write"), async (req: AuthedRequest, res, next) => {
    try {
      const config = telephonyConfig();
      if (!config.outboundConfigured) {
        return res.status(503).json({
          error: `Telefonia real indisponível. Configure: ${config.missing.join(", ")}.`,
        });
      }

      const data = req.data || await readDatabase();
      const agent = data.agents.find((item) => item.id === req.body.agentId && item.ownerId === req.tenantId);
      if (!agent) {
        return res.status(404).json({ error: "Agente não encontrado." });
      }

      if (!agent.questions.length) {
        return res.status(400).json({ error: "Este agente precisa de ao menos uma pergunta antes de ligar." });
      }

      const now = new Date().toISOString();
      const call: StoredTelephonyCall = {
        id: crypto.randomUUID(),
        ownerId: req.tenantId!,
        agentId: agent.id,
        agentName: agent.name,
        caller: String(req.body.caller || req.body.to || "Contato telefônico"),
        to: validatePhoneNumber(req.body.to),
        from: config.from,
        provider: "twilio",
        status: "queued",
        currentQuestionIndex: 0,
        transcriptItems: [],
        structuredDraft: normalizeStructuredDraft({}),
        startedAt: now,
        updatedAt: now,
      };

      data.telephonyCalls.push(call);
      await writeDatabase(data);

      try {
        const voiceUrl = `${config.publicBaseUrl}/api/twilio/voice/${call.id}`;
        const statusUrl = `${config.publicBaseUrl}/api/twilio/status/${call.id}`;
        const providerCall = await twilioCreateCall(call.to, call.from, voiceUrl, statusUrl);
        call.providerCallSid = providerCall.sid ? String(providerCall.sid) : undefined;
        call.status = mapTwilioStatus(providerCall.status);
        call.updatedAt = new Date().toISOString();
        await writeDatabase(data);
        res.status(201).json({ call: publicTelephonyCall(call) });
      } catch (error) {
        metrics.twilioFailures += 1;
        call.status = "failed";
        call.error = errorMessage(error, "Falha ao iniciar chamada na Twilio.");
        call.updatedAt = new Date().toISOString();
        await writeDatabase(data);
        res.status(502).json({ error: call.error, call: publicTelephonyCall(call) });
      }
    } catch (error) {
      next(error);
    }
});

export const twilioRouter = Router();

twilioRouter.post("/voice/:callId", async (req: Request, res: Response) => {
    try {
      const data = await readDatabase();
      const call = data.telephonyCalls.find((item) => item.id === req.params.callId);
      if (!call) {
        res.type("text/xml").send(twiml(`${say("Chamada não encontrada.")}<Hangup />`));
        return;
      }

      const agent = data.agents.find((item) => item.id === call.agentId && item.ownerId === call.ownerId);
      const question = agent?.questions[call.currentQuestionIndex];
      if (!agent || !question) {
        if (agent && call.transcriptItems.some((item) => item.role === "user")) {
          await finalizeTelephonyCall(data, call, agent);
          await writeDatabase(data);
        }
        res.type("text/xml").send(twiml(`${say("Obrigada. A conversa foi registrada.")}<Hangup />`));
        return;
      }

      const lastMessage = call.transcriptItems[call.transcriptItems.length - 1];
      if (!(lastMessage?.role === "agent" && lastMessage.text === question.text)) {
        call.transcriptItems.push({ role: "agent", text: question.text });
      }
      call.status = "in-progress";
      call.updatedAt = new Date().toISOString();
      await writeDatabase(data);

      const config = telephonyConfig();
      const retryUrl = `${config.publicBaseUrl}/api/twilio/voice/${call.id}`;
      const actionUrl = `${config.publicBaseUrl}/api/twilio/voice/${call.id}/answer`;
      res.type("text/xml").send(twiml(gatherSpeech(actionUrl, question.text, retryUrl)));
    } catch (error) {
       console.error(error);
       res.status(500).end();
    }
});

twilioRouter.post("/voice/:callId/answer", async (req: Request, res: Response) => {
    try {
      const data = await readDatabase();
      const call = data.telephonyCalls.find((item) => item.id === req.params.callId);
      const agent = call ? data.agents.find((item) => item.id === call.agentId && item.ownerId === call.ownerId) : undefined;

      if (!call || !agent) {
        res.type("text/xml").send(twiml(`${say("Chamada não encontrada.")}<Hangup />`));
        return;
      }

      const question = agent.questions[call.currentQuestionIndex];
      const answer = String(req.body.SpeechResult || req.body.Digits || "").trim();
      const config = telephonyConfig();
      const retryUrl = `${config.publicBaseUrl}/api/twilio/voice/${call.id}`;

      if (!question) {
        await finalizeTelephonyCall(data, call, agent);
        await writeDatabase(data);
        res.type("text/xml").send(twiml(`${say("Obrigada. A conversa foi registrada.")}<Hangup />`));
        return;
      }

      if (!answer) {
        const actionUrl = `${config.publicBaseUrl}/api/twilio/voice/${call.id}/answer`;
        res.type("text/xml").send(twiml(gatherSpeech(actionUrl, question.text, retryUrl)));
        return;
      }

      call.transcriptItems.push({ role: "user", text: answer });
      const risk = detectStructuredRisk(question, answer);
      call.structuredDraft = applyAnswerToDraft(normalizeStructuredDraft(call.structuredDraft), question, answer, risk);

      if (risk && question.stopOnRisk) {
        const escalation = "Identifiquei um possível sinal de atenção. Vou registrar prioridade alta e encaminhar para retorno humano.";
        call.transcriptItems.push({ role: "agent", text: escalation });
        await finalizeTelephonyCall(data, call, agent);
        await writeDatabase(data);
        res.type("text/xml").send(twiml(`${say(escalation)}<Hangup />`));
        return;
      }

      const nextIndex = call.currentQuestionIndex + 1;
      const nextQuestion = agent.questions[nextIndex];

      if (!nextQuestion) {
        const closing = "Obrigada. Vou registrar a conversa e preparar a entrega para a operação.";
        call.transcriptItems.push({ role: "agent", text: closing });
        await finalizeTelephonyCall(data, call, agent);
        await writeDatabase(data);
        res.type("text/xml").send(twiml(`${say(closing)}<Hangup />`));
        return;
      }

      call.currentQuestionIndex = nextIndex;
      call.transcriptItems.push({ role: "agent", text: nextQuestion.text });
      call.status = "in-progress";
      call.updatedAt = new Date().toISOString();
      await writeDatabase(data);

      const actionUrl = `${config.publicBaseUrl}/api/twilio/voice/${call.id}/answer`;
      res.type("text/xml").send(twiml(gatherSpeech(actionUrl, nextQuestion.text, retryUrl)));
    } catch (error) {
      console.error(error);
      res.status(500).end();
    }
});

twilioRouter.post("/status/:callId", async (req: Request, res: Response) => {
    try {
      const data = await readDatabase();
      const call = data.telephonyCalls.find((item) => item.id === req.params.callId);
      if (call) {
        call.providerCallSid = req.body.CallSid ? String(req.body.CallSid) : call.providerCallSid;
        call.status = mapTwilioStatus(req.body.CallStatus);
        call.updatedAt = new Date().toISOString();

        if (call.status === "completed" && !call.sessionId && call.transcriptItems.some((item) => item.role === "user")) {
          const agent = data.agents.find((item) => item.id === call.agentId && item.ownerId === call.ownerId);
          if (agent) await finalizeTelephonyCall(data, call, agent);
        }

        await writeDatabase(data);
      }
      res.status(204).end();
    } catch (error) {
      console.error(error);
      res.status(500).end();
    }
});

export { router as telephonyRouter };
