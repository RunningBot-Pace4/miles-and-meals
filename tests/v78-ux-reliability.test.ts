import { describe, expect, it } from "vitest";
import { selfServiceTripSchema, selfServiceTripUpdateSchema } from "@/lib/validation";

describe("v78 trip date integrity", () => {
  it("accepts a normal start/end range", () => {
    const result = selfServiceTripSchema.safeParse({
      name: "Japan",
      baseCurrency: "MYR",
      startDate: "2026-11-05",
      endDate: "2026-11-09",
      firstCountry: {
        code: "JP",
        defaultExchangeRate: 0.03,
        fxRateDate: "",
        fxRateProvider: "Manual",
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects end dates before the start date on create and edit", () => {
    const create = selfServiceTripSchema.safeParse({
      name: "Japan",
      baseCurrency: "MYR",
      startDate: "2026-11-09",
      endDate: "2026-11-05",
      firstCountry: {
        code: "JP",
        defaultExchangeRate: 0.03,
        fxRateDate: "",
        fxRateProvider: "Manual",
      },
    });
    const edit = selfServiceTripUpdateSchema.safeParse({
      name: "Japan",
      startDate: "2026-11-09",
      endDate: "2026-11-05",
    });

    expect(create.success).toBe(false);
    expect(edit.success).toBe(false);
  });
});
