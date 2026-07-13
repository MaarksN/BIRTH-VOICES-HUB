import { Response } from 'express'; import { settingsRepository } from '../repositories/settingsRepository.js'; import { AuthedRequest } from '../middlewares/auth.js'; import { voiceRuntimeSchema } from '../validators/settings.js';
export const voiceRuntimeController = {
  get: (req: AuthedRequest, res: Response) => res.json({ config: settingsRepository.getSetting(`runtime_${req.user!.id}`) || { voiceId: "eleven_rachel" } }),
  create: (req: AuthedRequest, res: Response) => { const p = voiceRuntimeSchema.safeParse(req.body); if (!p.success) return res.status(400).json({ error: p.error.issues[0].message }); settingsRepository.setSetting(`runtime_${req.user!.id}`, p.data.config); res.json({ success: true, config: p.data.config }); },
  update: (req: AuthedRequest, res: Response) => { const p = voiceRuntimeSchema.safeParse(req.body); if (!p.success) return res.status(400).json({ error: p.error.issues[0].message }); const nc = { ...(settingsRepository.getSetting(`runtime_${req.user!.id}`) || {}), ...p.data.config }; settingsRepository.setSetting(`runtime_${req.user!.id}`, nc); res.json({ success: true, config: nc }); },
  delete: (req: AuthedRequest, res: Response) => { settingsRepository.deleteSetting(`runtime_${req.user!.id}`); res.json({ success: true }); }
};
