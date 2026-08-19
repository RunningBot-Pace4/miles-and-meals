import { describe, expect, it } from "vitest";
import { getDailyFxRate } from "@/lib/fx";

describe("daily FX", () => {
  it("returns 1:1 without a network request for the trip base currency", async () => {
    const fx = await getDailyFxRate("MYR", "MYR");

    expect(fx.rate).toBe(1);
    expect(fx.baseCurrency).toBe("MYR");
    expect(fx.quoteCurrency).toBe("MYR");
    expect(fx.provider).toBe("Base currency");
  });
});
