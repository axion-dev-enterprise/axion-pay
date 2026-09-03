import crypto from 'node:crypto';
import type {
  ChargeResult,
  CreateChargeInput,
  PaymentProvider,
  PaymentStatus,
  RefundInput,
} from '../core/types.js';

type WooviProviderConfig = {
  apiBase: string;
  appId: string;
  publicKeysUrl: string;
};

type CachedKeys = {
  expiresAt: number;
  keys: string[];
};

let cachedKeys: CachedKeys | null = null;

export class WooviProvider implements PaymentProvider {
  public readonly name = 'woovi';

  constructor(private readonly cfg: WooviProviderConfig) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.cfg.apiBase}${path}`, {
      ...init,
      headers: {
        Authorization: this.cfg.appId,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(init.headers ?? {}),
      },
      signal: AbortSignal.timeout(15_000),
    });

    const text = await response.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = { bodyPreview: text.slice(0, 500) };
      }
    }

    if (!response.ok) {
      throw new Error(
        `Woovi/OpenPix ${response.status}: ${JSON.stringify(body)}`,
      );
    }

    return body as T;
  }

  async createCharge(input: CreateChargeInput): Promise<ChargeResult> {
    const payload: Record<string, unknown> = {
      correlationID: input.correlationId,
      value: input.amountCents,
    };

    if (input.comment) payload.comment = input.comment;

    if (input.customer) {
      payload.customer = {
        name: input.customer.name,
        taxID: input.customer.taxId,
        email: input.customer.email,
        phone: input.customer.phone,
      };
    }

    const data = await this.request<any>('/api/v1/charge', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return normalizeWooviCharge(data);
  }

  async getCharge(correlationId: string): Promise<ChargeResult> {
    const data = await this.request<any>(
      `/api/v1/charge/${encodeURIComponent(correlationId)}`,
    );

    return normalizeWooviCharge(data);
  }

  async refund(input: RefundInput): Promise<unknown> {
    return this.request(
      `/api/v1/charge/${encodeURIComponent(input.chargeCorrelationId)}/refund`,
      {
        method: 'POST',
        body: JSON.stringify({
          correlationID: input.refundCorrelationId,
          value: input.amountCents,
          comment: input.comment,
        }),
      },
    );
  }

  async verifyWebhook(rawBody: Buffer, signatureBase64: string): Promise<boolean> {
    const keys = await this.getWebhookPublicKeys();

    return keys.some((publicKey) => {
      const verify = crypto.createVerify('sha256');
      verify.write(rawBody);
      verify.end();
      return verify.verify(publicKey, signatureBase64, 'base64');
    });
  }

  private async getWebhookPublicKeys(): Promise<string[]> {
    if (cachedKeys && cachedKeys.expiresAt > Date.now()) {
      return cachedKeys.keys;
    }

    const response = await fetch(this.cfg.publicKeysUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      if (cachedKeys?.keys.length) return cachedKeys.keys;
      throw new Error(`Falha ao buscar chaves públicas do webhook: ${response.status}`);
    }

    const body = (await response.json()) as {
      public_keys?: Array<{ key?: string }>;
    };

    const keys = (body.public_keys ?? [])
      .map((item) => item.key)
      .filter((key): key is string => Boolean(key));

    if (!keys.length) {
      throw new Error('Nenhuma chave pública de webhook encontrada.');
    }

    cachedKeys = {
      keys,
      expiresAt: Date.now() + 60 * 60 * 1000,
    };

    return keys;
  }
}

function normalizeWooviCharge(data: any): ChargeResult {
  const charge = data?.charge ?? data;
  const status = mapStatus(charge?.status);

  return {
    provider: 'woovi',
    providerChargeId:
      String(charge?.identifier ?? charge?.globalID ?? charge?.correlationID ?? ''),
    correlationId: String(charge?.correlationID ?? ''),
    status,
    amountCents: Number(charge?.value ?? 0),
    brCode:
      charge?.brCode ??
      charge?.paymentMethods?.pix?.brCode ??
      charge?.pix?.brCode,
    qrCodeUrl:
      charge?.qrCodeImage ??
      charge?.paymentLinkUrl ??
      charge?.paymentMethods?.pix?.qrCodeImage,
    raw: data,
  };
}

function mapStatus(status: unknown): PaymentStatus {
  const value = String(status ?? '').toUpperCase();

  if (['COMPLETED', 'PAID', 'CONFIRMED'].includes(value)) return 'PAID';
  if (['EXPIRED'].includes(value)) return 'EXPIRED';
  if (['REFUNDED'].includes(value)) return 'REFUNDED';
  if (['ERROR', 'FAILED', 'CANCELED', 'CANCELLED'].includes(value)) return 'FAILED';
  if (['ACTIVE', 'CREATED'].includes(value)) return 'ACTIVE';

  return 'PENDING';
}
