import { Response } from 'express'; import { settingsRepository } from '../repositories/settingsRepository.js'; import { AuthedRequest } from '../middlewares/auth.js'; import { userSettingsSchema } from '../validators/settings.js';
export const settingsController = {
  get: (req: AuthedRequest, res: Response) => res.json({ settings: settingsRepository.getSetting(req.user!.id) || { theme: "light" } }),
  create: (req: AuthedRequest, res: Response) => { const p = userSettingsSchema.safeParse(req.body); if (!p.success) return res.status(400).json({ error: p.error.issues[0].message }); settingsRepository.setSetting(req.user!.id, p.data.settings); res.json({ success: true, settings: p.data.settings }); },
  update: (req: AuthedRequest, res: Response) => { const p = userSettingsSchema.safeParse(req.body); if (!p.success) return res.status(400).json({ error: p.error.issues[0].message }); const nc = { ...(settingsRepository.getSetting(req.user!.id) || {}), ...p.data.settings }; settingsRepository.setSetting(req.user!.id, nc); res.json({ success: true, settings: nc }); },
  delete: (req: AuthedRequest, res: Response) => { settingsRepository.deleteSetting(req.user!.id); res.json({ success: true }); }
};
