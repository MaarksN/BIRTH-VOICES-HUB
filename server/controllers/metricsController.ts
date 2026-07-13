import { Response } from 'express'; import crypto from 'crypto'; import { metricsRepository } from '../repositories/metricsRepository.js'; import { AuthedRequest } from '../middlewares/auth.js'; import { createMetricSchema } from '../validators/metrics.js';
export const metricsController = {
  list: (req: AuthedRequest, res: Response) => res.json({ metrics: metricsRepository.findForUser(req.user!.id) }),
  create: (req: AuthedRequest, res: Response) => { const p = createMetricSchema.safeParse(req.body); if (!p.success) return res.status(400).json({ error: p.error.issues[0].message }); res.json({ success: true, metric: metricsRepository.create({ id: crypto.randomUUID(), userId: req.user!.id, name: p.data.name, value: p.data.value, tags: p.data.tags || {}, timestamp: new Date().toISOString() }) }); },
  update: (req: AuthedRequest, res: Response) => res.status(501).json({ error: "Not supported" }),
  deleteAll: (req: AuthedRequest, res: Response) => { metricsRepository.deleteAllForUser(req.user!.id); res.json({ success: true }); }
};
