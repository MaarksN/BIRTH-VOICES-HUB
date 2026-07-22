import { Request, Response } from 'express';
import { getAgent, updateAgentConfig } from '../services/agentService.js';
import { knowledgeConfidenceEngine } from '../../lib/voice-runtime/intelligence/KnowledgeConfidenceEngine.js';

export async function addKnowledgeDocumentHandler(req: Request, res: Response) {
  try {
     const { agentId, name, keyword, content } = req.body;
     const agent = await getAgent(agentId, req.tenantId!);
     if (!agent) return res.status(404).json({ error: 'Agente não encontrado.' });

     // eslint-disable-next-line @typescript-eslint/no-explicit-any
     const config = agent.configuration as any || {};
     const knowledge = config.knowledge || [];
     knowledge.push({ id: crypto.randomUUID(), name, keyword, content, addedAt: Date.now() });

     await updateAgentConfig(agentId, req.tenantId!, { knowledge });
     res.json({ success: true, message: 'Documento adicionado à base de conhecimento do agente.' });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch(err: any) {
     res.status(500).json({ error: err.message });
  }
}

export async function testRagQueryHandler(req: Request, res: Response) {
  try {
     const { agentId, query } = req.body;
     const agent = await getAgent(agentId, req.tenantId!);
     if (!agent) return res.status(404).json({ error: 'Agente não encontrado.' });

     // eslint-disable-next-line @typescript-eslint/no-explicit-any
     const config = agent.configuration as any || {};
     const knowledge = config.knowledge || [];

     const result = knowledgeConfidenceEngine.evaluateKnowledge(query, knowledge);
     res.json({ success: true, result });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch(err: any) {
     res.status(500).json({ error: err.message });
  }
}
