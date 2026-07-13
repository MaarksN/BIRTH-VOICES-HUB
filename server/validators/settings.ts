import { z } from 'zod';
export const voiceRuntimeSchema = z.object({ config: z.any() });
export const userSettingsSchema = z.object({ settings: z.any() });
