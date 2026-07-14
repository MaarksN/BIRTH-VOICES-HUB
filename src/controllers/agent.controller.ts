import { Request, Response } from 'express';
import { agentSchema } from '../validators/index.js';
import { listAgents, createAgent, deleteAgent } from '../services/agentService.js';

export async function listAgentsHandler(req: Request, res: Response) {
  const agents = await listAgents(req.tenantId!);
  res.json({ agents });
}

export async function createAgentHandler(req: Request, res: Response) {
  const parsed = agentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const agent = await createAgent(req.tenantId!, req.user!.id, parsed.data);
  res.json({ success: true, agent });
}

export async function deleteAgentHandler(req: Request, res: Response) {
  await deleteAgent(req.params.id, req.tenantId!);
  res.json({ success: true });
}
