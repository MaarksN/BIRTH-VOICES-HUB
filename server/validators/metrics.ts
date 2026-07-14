import { z } from 'zod';
export const createMetricSchema = z.object({ name: z.string().min(1), value: z.number().or(z.string()), tags: z.record(z.string(), z.any()).optional() });
