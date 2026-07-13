import { z } from 'zod';
export const chatSchema = z.object({ prompt: z.string().optional(), currentMessages: z.array(z.any()), provider: z.string().optional() });
export const ttsSchema = z.object({ text: z.string() });
