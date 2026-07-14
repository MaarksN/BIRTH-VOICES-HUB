import { Response } from 'express'; import crypto from 'crypto'; import { userRepository } from '../repositories/userRepository.js'; import { hashPassword } from '../services/auth.js'; import { AuthedRequest } from '../middlewares/auth.js'; import { createUserSchema } from '../validators/user.js'; import { writeAuditLog } from '../services/audit.js';
export const userController = {
  list: (req: AuthedRequest, res: Response) => { res.json({ users: userRepository.findAll().map(u => ({ id: u.id, email: u.email, companyName: u.companyName, role: u.role || 'user', createdAt: u.createdAt })) }); },
  create: (req: AuthedRequest, res: Response) => {
    const parsed = createUserSchema.safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    if (userRepository.findByEmail(parsed.data.email)) return res.status(400).json({ error: "Email cadastrado." });
    const newUser = userRepository.create({ id: crypto.randomUUID(), email: parsed.data.email.toLowerCase(), passwordHash: hashPassword(parsed.data.password), companyName: parsed.data.companyName || "Org", role: parsed.data.role || 'user', createdAt: new Date().toISOString() });
    writeAuditLog(req.user!.id, "USER_CREATE", { targetUserId: newUser.id }); res.json({ success: true, user: newUser });
  },
  delete: (req: AuthedRequest, res: Response) => { const id = (req.params.id as string); if (id === req.user!.id) return res.status(400).json({ error: "Cannot delete self" }); userRepository.delete(id); writeAuditLog(req.user!.id, "USER_DELETE", { targetUserId: id }); res.json({ success: true }); }
};
