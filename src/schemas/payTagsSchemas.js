import { z } from "zod";

export const createPayTagSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
  description: z.string().max(500, "Descrição muito longa").optional(),
  webhookUrl: z.string().url("URL inválida").optional().or(z.literal(""))
});

export const togglePayTagSchema = z.object({
  id: z.string().uuid("ID inválido")
});
