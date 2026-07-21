import { randomUUID } from "node:crypto";

export async function createCardTransactionWithMock({
  amount_cents,
  capture = true,
  metadata = {}
}) {
  const status = capture ? "paid" : "authorized";
  const referenceId = metadata?.transactionId || randomUUID();

  return {
    success: true,
    status,
    provider: "mock",
    providerReference: `mock-card-${referenceId}`,
    raw: {
      amount_cents,
      capture,
      metadata
    }
  };
}
