import { Response } from 'express'; import { onboardingRepository } from '../repositories/onboardingRepository.js'; import { AuthedRequest } from '../middlewares/auth.js'; import { checklistSchema } from '../validators/onboarding.js';
export const onboardingController = {
  get: (req: AuthedRequest, res: Response) => res.json({ checklist: onboardingRepository.getChecklist(req.user!.id) || { orgCreated: true } }),
  save: (req: AuthedRequest, res: Response) => { const p = checklistSchema.safeParse(req.body); if (!p.success) return res.status(400).json({ error: p.error.issues[0].message }); onboardingRepository.setChecklist(req.user!.id, p.data.checklist); res.json({ success: true, checklist: p.data.checklist }); },
  delete: (req: AuthedRequest, res: Response) => { onboardingRepository.deleteChecklist(req.user!.id); res.json({ success: true }); }
};
