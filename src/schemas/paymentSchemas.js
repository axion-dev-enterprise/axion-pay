import { z } from "zod";
import { isPlainObject } from "../utils/validation.js";

const MAX_LIMIT = 200;

const plainObjectSchema = z.custom((value) => isPlainObject(value), {
  message: "Campo deve ser um objeto."
});

const amountSchema = z.union([z.number(), z.string()]).optional();
const amountCentsSchema = z.union([z.number(), z.string()]).optional();
const captureSchema = z.union([z.boolean(), z.literal("true"), z.literal("false")]).optional();

export const createPaymentSchema = z
  .object({
    amount: amountSchema,
    amount_cents: amountCentsSchema,
    currency: z.string().optional(),
    method: z.string().optional(),
    capture: captureSchema,
    metadata: plainObjectSchema.optional(),
    customer: plainObjectSchema.optional(),
    card: z.any().optional(),
    card_hash: z.string().optional()
  })
  .superRefine((data, ctx) => {
    if (data.amount === undefined && data.amount_cents === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Campo "amount" ou "amount_cents" e obrigatorio.',
        path: ["amount"]
      });
    }
  });

export const refundSchema = z
  .object({
    amount: amountSchema,
    amount_cents: amountCentsSchema
  })
  .partial()
  .optional();

export const metadataSchema = z.object({
  metadata: plainObjectSchema
});

export const paginationQuerySchema = z
  .object({
    limit: z
      .preprocess(
        (value) => (value === "" || value === undefined ? undefined : Number(value)),
        z.number().int().min(1).max(MAX_LIMIT)
      )
      .optional(),
    offset: z
      .preprocess(
        (value) => (value === "" || value === undefined ? undefined : Number(value)),
        z.number().int().min(0)
      )
      .optional(),
    status: z.string().optional(),
    method: z.string().optional(),
    provider: z.string().optional(),
    customer_id: z.string().optional(),
    created_from: z.string().optional(),
    created_to: z.string().optional()
  })
  .passthrough();

export const idParamSchema = z.object({
  id: z.string().min(1)
});

const statusValues = ["pending", "authorized", "paid", "failed", "canceled", "refunded", "expired"];
const methodValues = ["pix", "card"];

export const statusParamSchema = z.object({
  status: z
    .string()
    .min(1)
    .transform((value) => value.toLowerCase())
    .refine((value) => statusValues.includes(value), {
      message: "Status invalido."
    })
});

export const methodParamSchema = z.object({
  method: z
    .string()
    .min(1)
    .transform((value) => value.toLowerCase())
    .refine((value) => methodValues.includes(value), {
      message: "Metodo invalido."
    })
});

export const providerReferenceParamSchema = z.object({
  providerReference: z.string().min(1)
});

export const pixWebhookSchema = z.object({
  providerReference: z.string().min(1),
  event: z.enum(["PIX_CONFIRMED", "PIX_FAILED", "PIX_EXPIRED"])
});
