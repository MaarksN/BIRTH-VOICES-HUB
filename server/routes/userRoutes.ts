import { Router } from 'express'; import { userController } from '../controllers/userController.js'; import { requireAuth } from '../middlewares/auth.js'; import { requireAdmin } from '../middlewares/rbac.js';
const r = Router(); r.use(requireAuth, requireAdmin); r.get('/', userController.list); r.post('/', userController.create); r.delete('/:id', userController.delete); export default r;
