import { Router } from 'express'; import { mediaController } from '../controllers/mediaController.js';
const r = Router(); r.post('/ai/refactor', mediaController.refactor); r.post('/ai/generate-workflow', mediaController.generateWorkflow); export default r;
