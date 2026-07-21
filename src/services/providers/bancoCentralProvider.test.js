import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";

import { createPixTransactionWithBancoCentral } from "./bancoCentralProvider.js";

// CRC16-CCITT (0xFFFF, poly 0x1021) used by BR Code / PIX.
function crc16(payload) {
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ polynomial;
      } else {
        crc <<= 1;
      }
      crc &= 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

describe("Banco Central provider (BR Code)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.BC_PIX_KEY = "2e902cce-70ff-43d9-818c-2b41983b2f6c";
    process.env.BC_MERCHANT_NAME = "AXIONPAY";
    process.env.BC_MERCHANT_CITY = "SAO PAULO";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("generates a TLV BR Code payload with CRC (ends with 6304 + 4 hex)", async () => {
    const result = await createPixTransactionWithBancoCentral({
      amount: 73.5,
      amount_cents: 7350,
      customer: null,
      metadata: { transactionId: "ac2f73fc2f744498896ce2e9f5edf077", description: "Teste Pix" }
    });

    expect(result.success).toBe(true);
    expect(result.raw).toBeTruthy();
    expect(typeof result.raw.qr_code).toBe("string");

    const payload = result.raw.qr_code;
    expect(payload.startsWith("000201")).toBe(true);
    expect(payload.includes("br.gov.bcb.pix")).toBe(true);
    expect(payload.startsWith("000126")).toBe(false); // legacy broken format we want to avoid

    const match = payload.match(/6304([0-9A-F]{4})$/);
    expect(match).toBeTruthy();

    const providedCrc = match[1];
    const toCrc = payload.slice(0, -4);
    expect(crc16(toCrc)).toBe(providedCrc);
  });
});

