import express from 'express';
import { registerHandler, loginHandler, meHandler, logoutHandler } from '../controllers/auth.controller.js';

const router = express.Router();

router.post('/auth/register', registerHandler);
router.post('/auth/login', loginHandler);
router.get('/auth/me', meHandler);
router.post('/auth/logout', logoutHandler);

export default router;
