import express from 'express';
import { register, login, me, logout } from '../controllers/auth.controller.js';

const router = express.Router();

router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/me', me);
router.post('/auth/logout', logout);

export default router;
