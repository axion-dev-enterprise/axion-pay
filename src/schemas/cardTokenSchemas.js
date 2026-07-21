import { z } from "zod";

const monthSchema = z
  .string()
  .regex(/^(0?[1-9]|1[0-2])$/, "Mês inválido")
  .transform((value) => value.padStart(2, "0"));

const yearSchema = z
  .string()
  .regex(/^\d{2,4}$/, "Ano inválido")
  .transform((value) => {
    if (value.length === 2) {
      const normalized = Number(value);
      const currentYear = new Date().getFullYear();
      const prefix = String(currentYear).slice(0, 2);
      return `${prefix}${value}`;
    }
    return value;
  });

export const cardTokenSchema = z.object({
  cardNumber: z
    .string()
    .min(13)
    .max(19)
    .regex(/^\d+$/, "Número do cartão inválido."),
  expMonth: monthSchema,
  expYear: yearSchema,
  holderName: z.string().min(3, "Informe o nome do titular."),
  brand: z.string().optional()
});
