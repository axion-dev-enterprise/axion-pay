# AXION Pay SDK Guide (TypeScript / Node.js)

Este guia apresenta o cliente canônico em **TypeScript / Node.js** para consumir a API oficial da **AXION Pay** com tipagem estrita, idempotência automática e verificação nativa de assinaturas criptográficas de webhooks.

- **Base URL Oficial**: `https://api.axionenterprise.cloud`
- **Ambiente**: Produção (`axp_live_...`) ou Sandbox (`axp_test_...`)

---

## 1. Cliente TypeScript Canônico (Drop-in)

Você pode salvar este arquivo como `lib/axionPayClient.ts` no seu projeto:

```typescript
import crypto from "crypto";

export interface AxionClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export interface CustomerInput {
  name: string;
  email: string;
  taxId: string; // CPF (11 dígitos) ou CNPJ (14 dígitos)
  phone?: string;
}

export interface CreatePixChargeInput {
  correlationId: string;
  valueInCents: number;
  comment?: string;
  expiresInSeconds?: number;
  customer: CustomerInput;
  metadata?: Record<string, string>;
}

export interface CreateCardIntentInput {
  amountCents: number;
  currency?: "brl" | "usd";
  customerEmail: string;
  customerName: string;
  metadata?: Record<string, string>;
}

export interface CreateSubscriptionInput {
  customerEmail: string;
  customerName: string;
  amountCents: number;
  interval?: "month" | "year";
  trialDays?: number;
  metadata?: Record<string, string>;
}

export class AxionPayClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: AxionClientOptions) {
    if (!options.apiKey) throw new Error("AXION Pay: apiKey é obrigatória");
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl || "https://api.axionenterprise.cloud";
    this.timeoutMs = options.timeoutMs || 15000;
  }

  private async request<T>(path: string, method: "GET" | "POST" | "PUT" | "DELETE", body?: unknown, idempotencyKey?: string): Promise<T> {
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${this.apiKey}`,
      "Accept": "application/json",
    };

    if (body) {
      headers["Content-Type"] = "application/json";
    }

    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message = data?.detail || data?.message || data?.error || `HTTP ${response.status}`;
        throw new Error(`AXION Pay Error [${response.status}]: ${message}`);
      }

      return data as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  // --- PIX CHARGES ---
  public readonly charges = {
    createPix: async (input: CreatePixChargeInput, idempotencyKey?: string) => {
      return this.request<{
        charge: {
          correlationId: string;
          value: number;
          status: "ACTIVE" | "COMPLETED" | "EXPIRED";
          brCode: string;
          qrCodeImage: string;
          expiresAt: string;
        };
      }>("/v1/charges", "POST", {
        correlationId: input.correlationId,
        value: input.valueInCents,
        comment: input.comment,
        expiresInSeconds: input.expiresInSeconds || 3600,
        customer: {
          ...input.customer,
          taxId: input.customer.taxId.replace(/\D/g, ""),
        },
        metadata: input.metadata,
      }, idempotencyKey || `pix_${input.correlationId}_${Date.now()}`);
    },

    get: async (correlationId: string) => {
      return this.request<{
        charge: {
          correlationId: string;
          value: number;
          status: "ACTIVE" | "COMPLETED" | "EXPIRED" | "REFUNDED";
          paidAt?: string;
          paymentMethod?: string;
          endToEndId?: string;
        };
      }>(`/v1/charges/${correlationId}`, "GET");
    }
  };

  // --- CARTÃO DE CRÉDITO ---
  public readonly card = {
    getConfig: async () => {
      return this.request<{ publishableKey: string; supportedMethods: string[] }>("/v1/card/config", "GET");
    },

    createPaymentIntent: async (input: CreateCardIntentInput, idempotencyKey?: string) => {
      return this.request<{
        paymentIntentId: string;
        clientSecret: string;
        amountCents: number;
        currency: string;
      }>("/v1/card/payment-intents", "POST", {
        amountCents: input.amountCents,
        currency: input.currency || "brl",
        customerEmail: input.customerEmail,
        customerName: input.customerName,
        metadata: input.metadata,
      }, idempotencyKey || `card_${Date.now()}`);
    }
  };

  // --- ASSINATURAS RECORRENTES ---
  public readonly subscriptions = {
    create: async (input: CreateSubscriptionInput, idempotencyKey?: string) => {
      return this.request<{
        subscription: {
          id: string;
          status: string;
          amountCents: number;
          interval: string;
          portalToken: string;
        };
      }>("/v1/subscriptions", "POST", input, idempotencyKey || `sub_${Date.now()}`);
    },

    get: async (id: string) => {
      return this.request<{ subscription: any }>(`/v1/subscriptions/${id}`, "GET");
    },

    cancel: async (id: string, immediately = false) => {
      return this.request<{ success: boolean }>(`/v1/subscriptions/${id}/cancel`, "POST", { immediately });
    }
  };

  // --- UTILITÁRIOS DE SEGURANÇA ---
  public static verifyWebhookSignature(rawBody: Buffer | string, signature: string, webhookSecret: string): boolean {
    const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }
}
```

---

## 2. Exemplo de Uso Prático

```typescript
import { AxionPayClient } from "./lib/axionPayClient";

const axion = new AxionPayClient({
  apiKey: process.env.AXION_PAY_API_KEY!, // axp_live_...
});

async function run() {
  // 1. Criando cobrança Pix
  const pix = await axion.charges.createPix({
    correlationId: "pedido_9841",
    valueInCents: 4990, // R$ 49,90
    customer: {
      name: "João da Silva",
      email: "joao@email.com",
      taxId: "123.456.789-00",
    },
    metadata: { orderId: "9841" }
  });

  console.log("Pix Copia e Cola:", pix.charge.brCode);
  console.log("QR Code:", pix.charge.qrCodeImage);

  // 2. Criando intenção de cartão
  const card = await axion.card.createPaymentIntent({
    amountCents: 12900, // R$ 129,00
    customerEmail: "cliente@email.com",
    customerName: "Maria Souza",
    metadata: { orderId: "9842" }
  });

  console.log("ClientSecret para o frontend:", card.clientSecret);
}

run();
```
