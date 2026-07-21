import request from "supertest";
import { app } from "../app.js";
import { createPayTag } from "../models/payTagsStore.js";
import { createCheckoutProduct } from "../models/checkoutStore.js";

describe("publicCheckoutPaymentController", () => {
  it("creates PIX payment from a checkout product without API key", async () => {
    const key = `public-checkout-pix-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const userId = "user-public-checkout-test";
    const payTag = createPayTag({ userId, name: "public-checkout-tag", description: "test", webhookUrl: null });

    createCheckoutProduct({
      userId,
      payTagId: payTag.id,
      slug: "public-checkout-pix",
      title: "Checkout Test PIX",
      description: "test",
      price: 9.9,
      currency: "BRL",
      theme: "black",
      template: "classic",
      appearance: null,
      paymentConfig: { allowedMethods: ["pix", "card"], requiredFields: ["Nome completo", "Email"] },
      features: [],
      socialProof: []
    });

    const resp = await request(app)
      .post("/checkout/products/public-checkout-pix/payments/pix")
      .set("Idempotency-Key", key)
      .send({
        customer: { name: "Teste", email: "teste@example.com" }
      })
      .expect(201);

    expect(resp.body.ok).toBe(true);
    expect(resp.body.transaction).toBeTruthy();
    expect(resp.body.transaction.method).toBe("pix");
    expect(typeof resp.body.pix_payload).toBe("string");
    expect(resp.body.pix_payload.length).toBeGreaterThan(10);
  });

  it("creates card payment from a checkout product without API key", async () => {
    const key = `public-checkout-card-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const userId = "user-public-checkout-test-2";
    const payTag = createPayTag({ userId, name: "public-checkout-tag-2", description: "test", webhookUrl: null });

    createCheckoutProduct({
      userId,
      payTagId: payTag.id,
      slug: "public-checkout-card",
      title: "Checkout Test CARD",
      description: "test",
      price: 19.9,
      currency: "BRL",
      theme: "black",
      template: "classic",
      appearance: null,
      paymentConfig: { allowedMethods: ["pix", "card"], requiredFields: ["Nome completo", "Email"] },
      features: [],
      socialProof: []
    });

    const resp = await request(app)
      .post("/checkout/products/public-checkout-card/payments/card")
      .set("Idempotency-Key", key)
      .send({
        customer: { name: "Teste", email: "teste@example.com" },
        card: {
          number: "4000000000000002",
          exp_month: "12",
          exp_year: "2027",
          cvv: "123",
          holder_name: "Teste"
        }
      })
      .expect(201);

    expect(resp.body.ok).toBe(true);
    expect(resp.body.transaction).toBeTruthy();
    expect(resp.body.transaction.method).toBe("card");
  });
});
