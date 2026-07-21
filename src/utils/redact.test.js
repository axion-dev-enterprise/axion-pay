import { describe, it, expect } from "@jest/globals";

import { redactSensitiveFields } from "./redact.js";

describe("redactSensitiveFields", () => {
  it("returns primitives unchanged", () => {
    expect(redactSensitiveFields("boom")).toBe("boom");
    expect(redactSensitiveFields(123)).toBe(123);
    expect(redactSensitiveFields(false)).toBe(false);
  });

  it("redacts shallow fields", () => {
    expect(
      redactSensitiveFields({
        card_hash: "hash",
        cvv: "123"
      })
    ).toEqual({
      card_hash: "***",
      cvv: "***"
    });
  });

  it("redacts nested card.cvv safely", () => {
    expect(
      redactSensitiveFields({
        card: { brand: "visa", cvv: "123" }
      })
    ).toEqual({
      card: { brand: "visa", cvv: "***" }
    });
  });

  it("handles arrays", () => {
    expect(
      redactSensitiveFields([
        { cvv: "123" },
        "ok",
        { card: { cvv: "999" } }
      ])
    ).toEqual([{ cvv: "***" }, "ok", { card: { cvv: "***" } }]);
  });
});

