import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Formato de email inválido'),
  password: z.string().min(6, 'A senha precisa de no mínimo 6 caracteres'),
  companyName: z.string().min(2, 'Nome de empresa inválido'),
});

export const loginSchema = z.object({
  email: z.string().email('Formato de email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

export const saveWorkflowSchema = z.object({
  name: z.string().optional(),
  nodes: z.array(z.any()).optional(),
  edges: z.array(z.any()).optional(),
});

export const callLogSchema = z.object({
  patientName: z.string().optional(),
  duration: z.string().optional(),
  status: z.enum(['Concluído', 'Falhou']).optional(),
  agent: z.string().optional(),
});

export const sessionSchema = z.object({
  agentId: z.string().optional(),
  channel: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const voiceRuntimeSchema = z.object({ config: z.record(z.string(), z.any()) });
export const userSettingsSchema = z.object({ settings: z.record(z.string(), z.any()) });

export const brandColorSchema = z.object({ color: z.string().min(1) });

export const checklistSchema = z.object({ checklist: z.record(z.string(), z.boolean()) });

export const createUserSchema = z.object({
  email: z.string().email('Formato de email inválido'),
  password: z.string().min(6, 'A senha precisa de no mínimo 6 caracteres'),
  companyName: z.string().optional(),
  role: z.enum(['admin', 'user']).optional(),
});

export const updateUserSchema = z.object({
  companyName: z.string().optional(),
  role: z.enum(['admin', 'user']).optional(),
  password: z.string().min(6).optional(),
});

export const agentSchema = z.object({
  name: z.string().min(1, 'Nome do agente é obrigatório'),
  model: z.string().min(1, 'Modelo é obrigatório'),
  configuration: z.record(z.string(), z.any()).optional(),
});

export const metricSchema = z.object({
  name: z.string().min(1),
  value: z.number(),
  tags: z.record(z.string(), z.any()).optional(),
});
