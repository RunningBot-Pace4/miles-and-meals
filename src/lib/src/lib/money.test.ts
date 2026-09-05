import { describe, expect, it } from "vitest";
import { buildExpenseSplits, effectiveConvertedAmount } from "@/lib/money";

describe("buildExpenseSplits", () => {
  it("splits equally without losing cents", () => {
    expect(
      buildExpenseSplits(100, "EQUAL", [
        { userId: "a", value: 0 },
        { userId: "b", value: 0 },
        { userId: "c", value: 0 },
      ]),
    ).toEqual([
      { userId: "a", shareAmountBase: "33.34" },
      { userId: "b", shareAmountBase: "33.33" },
      { userId: "c", shareAmountBase: "33.33" },
    ]);
  });

  it("supports percentage splits", () => {
    expect(
      buildExpenseSplits(200, "PERCENTAGE", [
        { userId: "a", value: 70 },
        { userId: "b", value: 30 },
      ]),
    ).toEqual([
      { userId: "a", shareAmountBase: "140.00" },
      { userId: "b", shareAmountBase: "60.00" },
    ]);
  });

  it("supports exact amount splits", () => {
    expect(
      buildExpenseSplits(80, "EXACT", [
        { userId: "a", value: 50 },
        { userId: "b", value: 30 },
      ]),
    ).toEqual([
      { userId: "a", shareAmountBase: "50.00" },
      { userId: "b", shareAmountBase: "30.00" },
    ]);
  });

  it("supports share weights without losing cents", () => {
    expect(
      buildExpenseSplits(100, "SHARES", [
        { userId: "a", value: 2 },
        { userId: "b", value: 1 },
      ]),
    ).toEqual([
      { userId: "a", shareAmountBase: "66.67" },
      { userId: "b", shareAmountBase: "33.33" },
    ]);
  });

  it("rejects invalid percentages", () => {
    expect(() =>
      buildExpenseSplits(100, "PERCENTAGE", [
        { userId: "a", value: 60 },
        { userId: "b", value: 30 },
      ]),
    ).toThrow("100%");
  });
});


describe("effectiveConvertedAmount", () => {
  it("falls back to converted amount when a legacy actual amount is zero", () => {
    expect(effectiveConvertedAmount("46.58", "0.00")).toBe(46.58);
  });

  it("uses a positive actual card amount when available", () => {
    expect(effectiveConvertedAmount("46.58", "46.90")).toBe(46.9);
  });
});
