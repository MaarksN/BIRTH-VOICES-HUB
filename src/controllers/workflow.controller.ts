import { Request, Response } from 'express';
import { saveWorkflowSchema } from '../validators/index.js';
import { getWorkflow, saveWorkflow, updateWorkflow, removeWorkflow, NotFoundError } from '../services/workflowService.js';
import { writeAuditLog } from '../services/audit.js';

export async function getWorkflowHandler(req: Request, res: Response) {
  const workflow = await getWorkflow(req.tenantId!);
  res.json({ workflow: workflow || null });
}

export async function saveWorkflowHandler(req: Request, res: Response) {
  const parsed = saveWorkflowSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const workflow = await saveWorkflow(req.tenantId!, req.user!.id, parsed.data);
  writeAuditLog(req.tenantId, req.user!.id, 'WORKFLOW_SAVE', { workflowId: workflow.id, name: workflow.name });
  res.json({ success: true, workflow });
}

export async function updateWorkflowHandler(req: Request, res: Response) {
  const parsed = saveWorkflowSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  try {
    const workflow = await updateWorkflow(req.tenantId!, req.user!.id, parsed.data);
    writeAuditLog(req.tenantId, req.user!.id, 'WORKFLOW_UPDATE', { workflowId: workflow.id, name: workflow.name });
    res.json({ success: true, workflow });
  } catch (err) {
    if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
    throw err;
  }
}

export async function deleteWorkflowHandler(req: Request, res: Response) {
  try {
    const deleted = await removeWorkflow(req.tenantId!);
    writeAuditLog(req.tenantId, req.user!.id, 'WORKFLOW_DELETE', { workflowId: deleted.id });
    res.json({ success: true, message: 'Fluxo removido com sucesso.' });
  } catch (err) {
    if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
    throw err;
  }
}
