import { describe, expect, it } from "vitest";
import {
  effectiveExchangeRate,
  sameCurrency,
} from "@/lib/money";

describe("base currency exchange rate", () => {
  it("compares currency codes case-insensitively", () => {
    expect(sameCurrency("myr", "MYR")).toBe(true);
  });

  it("forces a 1:1 rate for MYR to MYR", () => {
    expect(effectiveExchangeRate("MYR", "MYR", 0.25)).toBe(1);
  });

  it("keeps the requested rate for a foreign currency", () => {
    expect(effectiveExchangeRate("VND", "MYR", 0.0001579)).toBe(
      0.0001579,
    );
  });
});
