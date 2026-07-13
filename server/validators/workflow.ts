import { z } from 'zod';
export const saveWorkflowSchema = z.object({ name: z.string().optional(), nodes: z.array(z.any()).optional(), edges: z.array(z.any()).optional() });
