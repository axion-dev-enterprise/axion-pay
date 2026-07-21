import os from "node:os";
import path from "node:path";
import { rm } from "node:fs/promises";
import supertest from "supertest";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";

let request;
let cleanupPath;

beforeAll(async () => {
  const tmpDir = path.join(os.tmpdir(), "axion-pay-tests");
  const storeFile = `store-test-${Date.now()}.json`;
  process.env.NODE_ENV = "test";
  process.env.DB_PATH = ":memory:";
  process.env.STORAGE_ROOT = tmpDir;
  process.env.STORAGE_FILE = storeFile;
  process.env.AUTH_REQUIRED = "false";
  process.env.API_KEY = "";

  cleanupPath = path.join(tmpDir, storeFile);
  await rm(cleanupPath, { force: true }).catch(() => {});

  const { app } = await import("../app.js");
  request = supertest(app);
});

afterAll(async () => {
  if (cleanupPath) {
    await rm(cleanupPath, { force: true }).catch(() => {});
  }
});

describe("Payments controller", () => {
  it("creates a PIX payment with payload and headers", async () => {
    const response = await request.post("/payments/pix").send({ amount: 12.34 }).expect(201);
    expect(response.body.ok).toBe(true);
    expect(response.body.transaction).toMatchObject({
      method: "pix",
      status: "pending"
    });
    expect(response.body.pix_payload).toBeTruthy();
    expect(response.headers.location).toMatch(/\/payments\/.+/);
    expect(response.headers["x-request-id"]).toBeDefined();
  });

  it("creates a card payment (mock) and returns paid status", async () => {
    const payload = {
      amount: 30,
      card: {
        number: "4111111111111111",
        exp_month: "12",
        exp_year: "2032",
        cvv: "123",
        holder_name: "Axion Test"
      }
    };

    const response = await request.post("/payments/card").send(payload).expect(201);
    expect(response.body.transaction.method).toBe("card");
    expect(response.body.transaction.status).toBe("paid");
    expect(response.body.transaction.provider).toBe("mock");
  });

  it("replays idempotent payment requests", async () => {
    const key = `test-idempotency-${Date.now()}`;
    const payload = { amount: 7.5, method: "pix" };

    const first = await request
      .post("/payments")
      .set("Idempotency-Key", key)
      .send(payload)
      .expect(201);

    const replay = await request
      .post("/payments")
      .set("Idempotency-Key", key)
      .send(payload)
      .expect(200);

    expect(replay.body.transaction.id).toBe(first.body.transaction.id);
    expect(replay.headers["idempotency-status"]).toBe("replayed");
  });
});
