import { z } from 'zod';
export const sessionSchema = z.object({ agentId: z.string().optional(), channel: z.string().optional(), metadata: z.record(z.string(), z.any()).optional() });
