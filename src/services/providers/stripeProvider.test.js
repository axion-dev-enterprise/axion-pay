import { createCardTransactionWithStripe, createCheckoutSessionWithStripe } from "./stripeProvider.js";

describe("stripeProvider unit tests", () => {
  test("createCardTransactionWithStripe retorne formato padronizado de sucesso (modo mock ou live)", async () => {
    const result = await createCardTransactionWithStripe({
      amount_cents: 29900,
      customer: { email: "teste@axion.com" },
      metadata: { transactionId: "TEST-STRIPE-001" }
    });

    expect(result).toHaveProperty("success");
    expect(result.success).toBe(true);
    expect(result).toHaveProperty("providerReference");
    expect(result).toHaveProperty("status");
  });

  test("createCheckoutSessionWithStripe retorne URL ou ID de sessão", async () => {
    const result = await createCheckoutSessionWithStripe({
      mode: "payment",
      line_items: [{ price_data: { currency: "brl", product_data: { name: "Plano Teste" }, unit_amount: 1000 }, quantity: 1 }],
      success_url: "http://localhost/success",
      cancel_url: "http://localhost/cancel"
    });

    expect(result.success).toBe(true);
    expect(result.url || result.sessionId).toBeTruthy();
  });
});
