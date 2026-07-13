import { z } from 'zod';
export const refactorSchema = z.object({ files: z.array(z.any()), instructions: z.string() });
export const generateWorkflowSchema = z.object({ prompt: z.string().min(1) });
