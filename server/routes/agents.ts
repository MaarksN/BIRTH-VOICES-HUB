import crypto from "crypto";
import { Router } from "express";
import {
  AuthedRequest,
  normalizeList,
  readDatabase,
  requireFields,
  writeDatabase,
} from "../repositories/database";
import { requireAuth, requirePermission } from "../middleware/auth";
import { appendAuditLog } from "./auth";
import { metrics } from "../middleware/common";
import { AgentConfig } from "../../types";

const router = Router();

function validateAgentConfig(body: Partial<AgentConfig>) {
  requireFields(body as Record<string, unknown>, ["name", "template", "description", "systemInstruction"]);

  if (!Array.isArray(body.questions)) {
    throw new Error("O roteiro do agente precisa conter uma lista de perguntas.");
  }

  return {
    name: String(body.name),
    template: body.template,
    description: String(body.description),
    language: String(body.language || "Português Brasileiro"),
    tone: Array.isArray(body.tone) ? body.tone.map(String) : [],
    speed: Number(body.speed || 1),
    systemInstruction: String(body.systemInstruction),
    analysisPrompt: String(body.analysisPrompt || ""),
    questions: body.questions.map((question, index: number) => ({
      id: String(question.id || crypto.randomUUID()),
      text: String(question.text || `Pergunta ${index + 1}`),
      type: question.type === "closed" ? "closed" : "open",
      collectAs: String(question.collectAs || "").trim() || undefined,
      required: Boolean(question.required),
      riskKeywords: normalizeList(question.riskKeywords).slice(0, 30),
      stopOnRisk: Boolean(question.stopOnRisk),
    })),
  } as AgentConfig;
}

router.get("/", requireAuth, (req: AuthedRequest, res) => {
    const agents = (req.data?.agents || [])
      .filter((agent) => agent.ownerId === req.tenantId)
      .map(({ ownerId: _ownerId, ...agent }) => agent);
    res.json({ agents });
});

router.post("/", requireAuth, requirePermission("agent:write"), async (req: AuthedRequest, res, next) => {
    try {
      const data = req.data || await readDatabase();
      const config = validateAgentConfig(req.body);
      const now = new Date().toISOString();
      const agent = {
        ...config,
        id: crypto.randomUUID(),
        ownerId: req.tenantId!,
        createdAt: now,
        updatedAt: now,
      };

      data.agents.push(agent);
      appendAuditLog(data, {
        organizationId: req.tenantId!,
        userId: req.user!.id,
        action: "agent_create",
        requestId: req.requestId,
        metadata: { agentId: agent.id, name: agent.name },
      });
      await writeDatabase(data);
      const { ownerId: _ownerId, ...publicAgent } = agent;
      res.status(201).json({ agent: publicAgent });
    } catch (error) {
      next(error);
    }
});

router.put("/:id", requireAuth, requirePermission("agent:write"), async (req: AuthedRequest, res, next) => {
    try {
      const data = req.data || await readDatabase();
      const index = data.agents.findIndex((agent) => agent.id === req.params.id && agent.ownerId === req.tenantId);

      if (index < 0) {
        return res.status(404).json({ error: "Agente não encontrado." });
      }

      const config = validateAgentConfig(req.body);
      data.agents[index] = {
        ...data.agents[index],
        ...config,
        updatedAt: new Date().toISOString(),
      };

      await writeDatabase(data);
      appendAuditLog(data, {
        organizationId: req.tenantId!,
        userId: req.user!.id,
        action: "agent_update",
        requestId: req.requestId,
        metadata: { agentId: req.params.id },
      });
      await writeDatabase(data);
      const { ownerId: _ownerId, ...agent } = data.agents[index];
      res.json({ agent });
    } catch (error) {
      next(error);
    }
});

router.delete("/:id", requireAuth, requirePermission("agent:write"), async (req: AuthedRequest, res, next) => {
    try {
      const data = req.data || await readDatabase();
      const before = data.agents.length;
      data.agents = data.agents.filter((agent) => !(agent.id === req.params.id && agent.ownerId === req.tenantId));

      if (data.agents.length === before) {
        return res.status(404).json({ error: "Agente não encontrado." });
      }

      appendAuditLog(data, {
        organizationId: req.tenantId!,
        userId: req.user!.id,
        action: "agent_delete",
        requestId: req.requestId,
        metadata: { agentId: req.params.id },
      });
      await writeDatabase(data);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
});

export const metricsRouter = Router();
metricsRouter.get("/", requireAuth, requirePermission("admin:read"), (_req: AuthedRequest, res) => {
    const averageLatencyMs = metrics.requests ? Math.round(metrics.totalLatencyMs / metrics.requests) : 0;
    res.json({
      ...metrics,
      averageLatencyMs,
    });
});

export { router as agentsRouter };
