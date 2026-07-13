import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Formato de email inválido"),
  password: z.string().min(6, "A senha precisa de no mínimo 6 caracteres"),
  companyName: z.string().min(2, "Nome de empresa inválido")
});

export const loginSchema = z.object({
  email: z.string().email("Formato de email inválido"),
  password: z.string().min(1, "Senha é obrigatória")
});
