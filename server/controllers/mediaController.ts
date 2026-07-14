import { Response, Request } from 'express'; import { refactorSchema, generateWorkflowSchema } from '../validators/media.js';
export const mediaController = {
  refactor: async (req: Request, res: Response) => res.json({ result: "Refactored" }),
  generateWorkflow: async (req: Request, res: Response) => res.json({ workflowStr: "{}" })
};
