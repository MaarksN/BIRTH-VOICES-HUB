import express from 'express';
import authRoutes from './auth.routes.js';
import workflowRoutes from './workflow.routes.js';
import callLogRoutes from './callLog.routes.js';
import onboardingRoutes from './onboarding.routes.js';
import brandColorRoutes from './brandColor.routes.js';
import voiceRuntimeRoutes from './voiceRuntime.routes.js';
import metricsRoutes from './metrics.routes.js';
import sessionRoutes from './session.routes.js';
import settingsRoutes from './settings.routes.js';
import agentRoutes from './agent.routes.js';
import organizationRoutes from './organization.routes.js';
import userRoutes from './user.routes.js';
import aiRoutes from './ai.routes.js';
import observabilityRoutes from './observability.routes.js';

const router = express.Router();

router.use(authRoutes);
router.use(workflowRoutes);
router.use(callLogRoutes);
router.use(onboardingRoutes);
router.use(brandColorRoutes);
router.use(voiceRuntimeRoutes);
router.use(metricsRoutes);
router.use(sessionRoutes);
router.use(settingsRoutes);
router.use(agentRoutes);
router.use(organizationRoutes);
router.use(userRoutes);
router.use(aiRoutes);
router.use(observabilityRoutes);

export default router;
