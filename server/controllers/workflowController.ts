import { Response } from 'express'; import crypto from 'crypto'; import { workflowRepository } from '../repositories/workflowRepository.js'; import { AuthedRequest } from '../middlewares/auth.js'; import { saveWorkflowSchema } from '../validators/workflow.js';
export const workflowController = {
  get: (req: AuthedRequest, res: Response) => res.json({ workflow: workflowRepository.findByUserId(req.user!.id) || null }),
  save: (req: AuthedRequest, res: Response) => {
    const p = saveWorkflowSchema.safeParse(req.body); if (!p.success) return res.status(400).json({ error: p.error.issues[0].message });
    let w = workflowRepository.findByUserId(req.user!.id);
    if (w) { w.nodes = p.data.nodes || []; w.edges = p.data.edges || []; w.name = p.data.name || w.name; w.updatedAt = new Date().toISOString(); workflowRepository.update(w); }
    else { w = { id: crypto.randomUUID(), userId: req.user!.id, name: p.data.name || "Default", nodes: p.data.nodes || [], edges: p.data.edges || [], updatedAt: new Date().toISOString() }; workflowRepository.create(w); }
    res.json({ success: true, workflow: w });
  },
  update: (req: AuthedRequest, res: Response) => {
    const p = saveWorkflowSchema.safeParse(req.body); if (!p.success) return res.status(400).json({ error: p.error.issues[0].message });
    let w = workflowRepository.findByUserId(req.user!.id); if (!w) return res.status(404).json({ error: "Not found" });
    w.nodes = p.data.nodes || w.nodes; w.edges = p.data.edges || w.edges; w.name = p.data.name || w.name; w.updatedAt = new Date().toISOString(); workflowRepository.update(w);
    res.json({ success: true, workflow: w });
  }
};
