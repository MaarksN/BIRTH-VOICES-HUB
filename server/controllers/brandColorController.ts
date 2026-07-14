import { Response } from 'express'; import { brandColorRepository } from '../repositories/brandColorRepository.js'; import { AuthedRequest } from '../middlewares/auth.js'; import { brandColorSchema } from '../validators/brandColor.js';
export const brandColorController = {
  get: (req: AuthedRequest, res: Response) => res.json({ brandColor: brandColorRepository.getColor(req.user ? req.user.id : 'anonymous') || "#2563eb" }),
  save: (req: AuthedRequest, res: Response) => { const p = brandColorSchema.safeParse(req.body); if (!p.success) return res.status(400).json({ error: p.error.issues[0].message }); brandColorRepository.setColor(req.user ? req.user.id : 'anonymous', p.data.color); res.json({ success: true, brandColor: p.data.color }); },
  delete: (req: AuthedRequest, res: Response) => { brandColorRepository.deleteColor(req.user ? req.user.id : 'anonymous'); res.json({ success: true }); }
};
