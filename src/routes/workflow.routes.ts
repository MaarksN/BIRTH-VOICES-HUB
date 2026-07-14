import express from 'express';
import { requireTenant } from '../middlewares/rbac.js';
import { getWorkflowHandler, saveWorkflowHandler, updateWorkflowHandler, deleteWorkflowHandler } from '../controllers/workflow.controller.js';

const router = express.Router();

router.get('/workflow', requireTenant, getWorkflowHandler);
router.post('/workflow', requireTenant, saveWorkflowHandler);
router.put('/workflow', requireTenant, updateWorkflowHandler);
router.delete('/workflow', requireTenant, deleteWorkflowHandler);

export default router;
