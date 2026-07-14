import express from 'express';
import { requireTenant, requireRole } from '../middlewares/rbac.js';
import { listUsersHandler, createUserHandler, updateUserHandler, deleteUserHandler } from '../controllers/user.controller.js';

const router = express.Router();

router.get('/users', requireTenant, requireRole(['admin']), listUsersHandler);
router.post('/users', requireTenant, requireRole(['admin']), createUserHandler);
router.put('/users/:id', requireTenant, updateUserHandler);
router.delete('/users/:id', requireTenant, requireRole(['admin']), deleteUserHandler);

export default router;
