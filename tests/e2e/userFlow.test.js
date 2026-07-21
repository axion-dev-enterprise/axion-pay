import os from "os";
import path from "path";
import fs from "node:fs/promises";
import supertest from "supertest";
import { generateCpf, randomWhatsapp } from "../helpers/identifiers.js";

const tmpDir = path.join(os.tmpdir(), "axion-pay-tests");
const storeFile = "store-e2e.json";
const storagePath = path.join(tmpDir, storeFile);

let agent;

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.DB_PATH = ":memory:";
  process.env.STORAGE_ROOT = tmpDir;
  process.env.STORAGE_FILE = storeFile;
  process.env.ALLOW_ALL_CORS = "true";
  process.env.MIN_PAYOUT_ACCOUNT_AGE_MS = "0";
  await fs.rm(storagePath, { force: true });
  const { app } = await import("../../src/app.js");
  agent = supertest.agent(app);
});

afterAll(async () => {
  await fs.rm(storagePath, { force: true });
});

describe("Full user flow", () => {
  const password = "AxionPay123!";
  const whatsapp = `55${Math.floor(100000000 + Math.random() * 900000000)}`;
  const cpf = generateCpf();

  it("signs up, logs in, manages pay-tags, and requests payouts", async () => {
    const signup = await agent
      .post("/signup")
      .send({
        name: "Fluxo E2E",
        cpf,
        whatsapp,
        password
      })
      .expect(201);
    expect(signup.body.api_key).toBeDefined();

    await agent
      .post("/auth/login")
      .send({ identifier: whatsapp, password })
      .expect(200);

    const tagName = `e2e-${Date.now()}`;
    const createTag = await agent
      .post("/api/dashboard/pay-tags")
      .send({ name: tagName, description: "teste fullflow" })
      .expect(201);
    expect(createTag.body.pay_tag.name).toBe(tagName);

    const listTags = await agent.get("/api/dashboard/pay-tags").expect(200);
    expect(listTags.body.pay_tags.find((tag) => tag.id === createTag.body.pay_tag.id)).toBeDefined();

    const checkoutPayload = {
      slug: `e2e-checkout-${Date.now()}`,
      title: "Checkout automatizado",
      description: "Teste de checkout com provas sociais e PIX recomendado.",
      price: 259,
      currency: "BRL",
      theme: "black",
      pay_tag_id: createTag.body.pay_tag.id,
      socialProof: [
        { name: "Fluxo Premium", description: "Pagamentos validados em <4s", note: "Beta" }
      ]
    };
    const createProduct = await agent.post("/api/dashboard/products").send(checkoutPayload).expect(201);
    expect(createProduct.body.product.slug).toBe(checkoutPayload.slug.toLowerCase());

    const updatedPrice = 199;
    const updatedProduct = await agent
      .patch(`/api/dashboard/products/${createProduct.body.product.id}`)
      .send({ price: updatedPrice })
      .expect(200);
    expect(updatedProduct.body.product.price).toBe(updatedPrice);

    await agent
      .delete(`/api/dashboard/products/${createProduct.body.product.id}`)
      .expect(200);

    await agent.delete(`/api/dashboard/pay-tags/${createTag.body.pay_tag.id}`).expect(200);

    const postKey = await agent.post("/account/payout-key").send({ destination: "pix@example.com" }).expect(201);
    expect(postKey.body.destination).toBe("pix@example.com");

    const payout = await agent
      .post("/api/dashboard/payouts")
      .send({ amount: 150, method: "pix", destination: "pix@example.com" })
      .expect(201);
    expect(payout.body.request.status).toBe("pending");
  });
});
