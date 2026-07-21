import os from "node:os";
import path from "node:path";
import { rm } from "node:fs/promises";
import supertest from "supertest";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { config } from "../config/env.js";
import { generateCpf, randomWhatsapp } from "../../tests/helpers/identifiers.js";

const tmpDir = path.join(os.tmpdir(), "axion-pay-payout-tests");
const storeFile = `store-payout-${Date.now()}.json`;
const storagePath = path.join(tmpDir, storeFile);

let agent;

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.DB_PATH = ":memory:";
  process.env.STORAGE_ROOT = tmpDir;
  process.env.STORAGE_FILE = storeFile;
  process.env.ALLOW_ALL_CORS = "true";
  await rm(storagePath, { force: true });
  config.payout = config.payout || {};
  config.payout.minAccountAgeMs = 0;
  const { app } = await import("../app.js");
  agent = supertest.agent(app);
});

afterAll(async () => {
  await rm(storagePath, { force: true });
});

describe("Payout controller", () => {
  const password = "AxionPay123!";
  const whatsapp = randomWhatsapp();
  const cpf = generateCpf();

  it("creates payout key and request, then lists it", async () => {
    await agent
      .post("/signup")
      .send({ name: "Fluxo Payout", cpf, whatsapp, password })
      .expect(201);

    await agent.post("/auth/login").send({ identifier: whatsapp, password }).expect(200);

    await agent.post("/account/payout-key").send({ destination: "pix@axionpay.test" }).expect(201);

    const payout = await agent
      .post("/api/dashboard/payouts")
      .send({ amount: 420, method: "pix", destination: "pix@axionpay.test" })
      .expect(201);

    expect(payout.body.request.status).toBe("pending");
    expect(payout.body.request.feeTotal).toBeCloseTo(3.1, 5);
    expect(payout.body.request.netAmount).toBeCloseTo(416.9, 5);

    const list = await agent.get("/api/dashboard/payouts").expect(200);
    expect(list.body.requests.find((entry) => entry.id === payout.body.request.id)).toBeDefined();
    expect(list.body.eligible).toBe(true);
  });

  it("rejects payouts with invalid amount", async () => {
    const response = await agent
      .post("/api/dashboard/payouts")
      .send({ amount: 0, method: "pix", destination: "pix@axionpay.test" })
      .expect(400);

    expect(response.body.code).toBe("invalid_amount");
  });
});
