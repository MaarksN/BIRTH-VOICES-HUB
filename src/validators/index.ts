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
  contactName: z.string().optional(),
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

// The server POSTs to whatever callbackUrl a client supplies, so an unrestricted value here is an
// SSRF primitive. Requiring HTTPS blocks non-HTTP schemes outright and keeps call transcripts off
// the wire in the clear; plain http stays allowed outside production for local receivers.
// Note this does not resolve DNS, so it does not by itself stop a public name pointing at a
// private address — tighten with an egress allowlist if untrusted tenants ever get API access.
const callbackUrlSchema = z
  .string()
  .url('callbackUrl deve ser uma URL válida')
  .refine(
    (value) => {
      let parsed: URL;
      try {
        parsed = new URL(value);
      } catch {
        return false;
      }
      if (parsed.protocol === 'https:') return true;
      return parsed.protocol === 'http:' && process.env.NODE_ENV !== 'production';
    },
    { message: 'callbackUrl deve usar HTTPS' },
  );

export const outboundCallSchema = z.object({
  agentId: z.string().min(1, 'agentId é obrigatório'),
  // E.164. A CRM dialing a prospect list will inevitably send malformed numbers; rejecting them
  // here costs nothing, while Twilio rejects them after we have already created a session.
  targetNumber: z
    .string()
    .regex(/^\+[1-9]\d{7,14}$/, 'targetNumber deve estar no formato E.164 (ex: +5511999998888)'),
  context: z.record(z.string(), z.any()).optional(),
  callbackUrl: callbackUrlSchema.optional(),
});
