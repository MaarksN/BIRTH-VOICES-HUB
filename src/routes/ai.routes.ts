import express from 'express';
import { requireTenant } from '../middlewares/rbac.js';
import {
  chatHandler,
  ttsHandler,
  generateMusicHandler,
  generateVideoHandler,
  videoStatusHandler,
  videoDownloadHandler,
  refactorWorkflowHandler,
  generateWorkflowHandler,
} from '../controllers/ai.controller.js';

const router = express.Router();

router.post('/chat', requireTenant, chatHandler);
router.post('/tts', requireTenant, ttsHandler);
router.post('/generate-music', requireTenant, generateMusicHandler);
router.post('/generate-video', requireTenant, generateVideoHandler);
router.post('/video-status', requireTenant, videoStatusHandler);
router.get('/video-download', requireTenant, videoDownloadHandler);
router.post('/ai/refactor', requireTenant, refactorWorkflowHandler);
router.post('/ai/generate-workflow', requireTenant, generateWorkflowHandler);

export default router;
