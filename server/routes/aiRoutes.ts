import { Router } from 'express'; import { aiController } from '../controllers/aiController.js';
const r = Router(); r.get('/observability/metrics', aiController.observability); r.post('/chat', aiController.chat); r.post('/tts', aiController.tts); export default r;
