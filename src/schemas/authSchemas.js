import { z } from "zod";
import { isPlainObject } from "../utils/validation.js";

const plainObjectSchema = z.custom((value) => isPlainObject(value), {
  message: "Campo deve ser um objeto."
});

export const signupSchema = z.object({
  name: z.string().min(1, "Nome obrigatorio."),
  cpf: z.string().min(11, "CPF obrigatorio."),
  whatsapp: z.string().min(8, "WhatsApp obrigatorio."),
  password: z.string().min(8, "Senha precisa ter pelo menos 8 caracteres.")
});

export const loginSchema = z.object({
  identifier: z.string().min(5, "Informe WhatsApp ou email."),
  password: z.string().min(1, "Senha obrigatoria.")
});

export const resendConfirmationSchema = z.object({
  email: z.string().email("Email invalido.")
});

export const apiKeyCreateSchema = z
  .object({
    label: z.string().max(50).optional()
  })
  .optional()
  .default({});

export const adminLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

export const adminUserStatusSchema = z
  .object({
    notes: z.string().max(300).optional(),
    sendDocs: z.boolean().optional()
  })
  .optional()
  .default({});

export const adminUsersQuerySchema = z
  .object({
    status: z.string().optional(),
    limit: z
      .preprocess(
        (value) => (value === "" || value === undefined ? undefined : Number(value)),
        z.number().int().min(1).max(200)
      )
      .optional(),
    offset: z
      .preprocess(
        (value) => (value === "" || value === undefined ? undefined : Number(value)),
        z.number().int().min(0)
      )
      .optional()
  })
  .passthrough();

export const adminTagCreateSchema = z.object({
  tag: z.string().min(1).max(50),
  permissions: z.array(z.string().min(1)).optional()
});

export const payoutKeySchema = z.object({
  destination: z.string().min(3, "Informe uma chave PIX valida.")
});

export const emailDocsSchema = z
  .object({
    message: z.string().max(500).optional(),
    metadata: plainObjectSchema.optional()
  })
  .optional()
  .default({});

