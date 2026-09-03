export type PaymentStatus =
  | 'CREATING'
  | 'PENDING'
  | 'ACTIVE'
  | 'PAID'
  | 'EXPIRED'
  | 'REFUNDED'
  | 'FAILED';

export interface CreateChargeInput {
  correlationId: string;
  amountCents: number;
  comment?: string;
  customer?: {
    name?: string;
    taxId?: string;
    email?: string;
    phone?: string;
  };
}

export interface ChargeResult {
  provider: string;
  providerChargeId: string;
  correlationId: string;
  status: PaymentStatus;
  amountCents: number;
  brCode?: string;
  qrCodeUrl?: string;
  raw: unknown;
}

export type StoredPaymentIntent = {
  id: string;
  merchant_id: string;
  idempotency_key: string;
  provider: string;
  correlation_id: string;
  provider_charge_id: string | null;
  amount_cents: number;
  status: PaymentStatus;
  qr_code: string | null;
  br_code: string | null;
  created_at: string;
  updated_at: string;
};

export interface RefundInput {
  chargeCorrelationId: string;
  refundCorrelationId: string;
  amountCents?: number;
  comment?: string;
}

export interface PaymentProvider {
  name: string;
  createCharge(input: CreateChargeInput): Promise<ChargeResult>;
  getCharge(correlationId: string): Promise<ChargeResult>;
  refund(input: RefundInput): Promise<unknown>;
}

export interface AccountSnapshot {
  source: string;
  balanceCents?: number;
  capturedAt: string;
  raw: unknown;
}
