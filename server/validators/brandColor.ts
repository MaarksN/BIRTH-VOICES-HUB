import { z } from 'zod';
export const brandColorSchema = z.object({ color: z.string().min(1) });
