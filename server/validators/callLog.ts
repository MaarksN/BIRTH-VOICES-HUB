import { z } from 'zod';
export const callLogSchema = z.object({ patientName: z.string().optional(), duration: z.string().optional(), status: z.enum(['Concluído', 'Falhou']).optional(), agent: z.string().optional() });
