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
  getAiConsentHandler,
  setAiConsentHandler,
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
// AI provider consent (LGPD) — gates every LLMGateway call to an external provider for this
// tenant. See src/services/settingService.ts (getAiConsent/grantAiConsent/revokeAiConsent) and
// .agents/handoffs/onda-2/04-para-01-ai-consent-schema.md for the first-class schema follow-up.
router.get('/ai/consent', requireTenant, getAiConsentHandler);
router.post('/ai/consent', requireTenant, setAiConsentHandler);

export default router;
