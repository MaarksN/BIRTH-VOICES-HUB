import { Router } from 'express'; import { authController } from '../controllers/authController.js'; import { requireAuth } from '../middlewares/auth.js';
const r = Router(); r.post('/register', authController.register); r.post('/login', authController.login); r.post('/logout', authController.logout); r.get('/me', requireAuth, authController.me); export default r;
