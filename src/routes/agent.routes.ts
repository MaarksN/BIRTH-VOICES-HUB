import express from 'express';
import { requireTenant } from '../middlewares/rbac.js';
import { listAgentsHandler, createAgentHandler, deleteAgentHandler } from '../controllers/agent.controller.js';

const router = express.Router();

router.get('/agents', requireTenant, listAgentsHandler);
router.post('/agents', requireTenant, createAgentHandler);
router.delete('/agents/:id', requireTenant, deleteAgentHandler);

export default router;
