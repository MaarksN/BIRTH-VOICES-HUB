import { Request, Response } from 'express';
import { createUserSchema, updateUserSchema } from '../validators/index.js';
import { listUsers, createUserInTenant, updateUserProfile, deleteUser, UserServiceError } from '../services/userService.js';
import { writeAuditLog } from '../services/audit.js';

export async function listUsersHandler(req: Request, res: Response) {
  const users = await listUsers(req.tenantId!);
  res.json({ users });
}

export async function createUserHandler(req: Request, res: Response) {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  try {
    const user = await createUserInTenant(req.tenantId!, parsed.data);
    writeAuditLog(req.tenantId, req.user!.id, 'USER_CREATE_BY_ADMIN', { targetUserId: user.id, email: user.email });
    res.json({ success: true, user });
  } catch (err) {
    if (err instanceof UserServiceError) return res.status(err.status).json({ error: err.message });
    throw err;
  }
}

export async function updateUserHandler(req: Request, res: Response) {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  try {
    await updateUserProfile(req.params.id, req.tenantId!, req.user!, parsed.data);
    writeAuditLog(req.tenantId, req.user!.id, 'USER_UPDATE', { targetUserId: req.params.id });
    res.json({ success: true, message: 'Perfil atualizado com sucesso.' });
  } catch (err) {
    if (err instanceof UserServiceError) return res.status(err.status).json({ error: err.message });
    throw err;
  }
}

export async function deleteUserHandler(req: Request, res: Response) {
  try {
    await deleteUser(req.params.id, req.tenantId!, req.user!.id);
    writeAuditLog(req.tenantId, req.user!.id, 'USER_DELETE', { targetUserId: req.params.id });
    res.json({ success: true, message: 'Usuário excluído com sucesso.' });
  } catch (err) {
    if (err instanceof UserServiceError) return res.status(err.status).json({ error: err.message });
    throw err;
  }
}
