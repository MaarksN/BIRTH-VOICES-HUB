import { Response } from 'express'; import crypto from 'crypto'; import { callLogRepository } from '../repositories/callLogRepository.js'; import { AuthedRequest } from '../middlewares/auth.js'; import { callLogSchema } from '../validators/callLog.js';
export const callLogController = {
  list: (req: AuthedRequest, res: Response) => res.json({ callLogs: callLogRepository.findForUser(req.user ? req.user.id : 'system') }),
  create: (req: AuthedRequest, res: Response) => {
    const p = callLogSchema.safeParse(req.body); if (!p.success) return res.status(400).json({ error: p.error.issues[0].message });
    res.json({ success: true, log: callLogRepository.create({ id: crypto.randomUUID(), userId: req.user ? req.user.id : 'anonymous', patientName: p.data.patientName || "Anon", duration: p.data.duration || "00:00", status: p.data.status || "Concluído", time: "Now", agent: p.data.agent || "Agent", timestamp: new Date().toISOString() }) });
  },
  update: (req: AuthedRequest, res: Response) => {
    const p = callLogSchema.safeParse(req.body); if (!p.success) return res.status(400).json({ error: p.error.issues[0].message });
    const log = callLogRepository.findByIdAndUser((req.params.id as string), req.user!.id); if (!log) return res.status(404).json({ error: "Not found" });
    log.patientName = p.data.patientName || log.patientName; log.status = p.data.status || log.status; log.duration = p.data.duration || log.duration; callLogRepository.update(log); res.json({ success: true, log });
  },
  delete: (req: AuthedRequest, res: Response) => {
    if (!callLogRepository.findByIdAndUser((req.params.id as string), req.user!.id)) return res.status(404).json({ error: "Not found" });
    callLogRepository.delete((req.params.id as string)); res.json({ success: true });
  }
};
