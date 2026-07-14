import { z } from 'zod';
export const checklistSchema = z.object({ checklist: z.record(z.string(), z.boolean()) });
