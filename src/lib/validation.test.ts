import { describe, expect, it } from "vitest";
import { expenseSchema } from "@/lib/validation";

const baseExpense = {
  countryId: "11111111-1111-4111-8111-111111111111",
  expenseDate: "2026-08-18",
  category: "Food",
  description: "Dinner",
  transactionCurrency: "VND",
  transactionAmount: 295000,
  exchangeRate: 0.0001579,
  rateType: "DEFAULT" as const,
  paidByUserId: "user-1",
  paymentMethod: "",
  receiptUrl: "",
  notes: "",
  splitMode: "EQUAL" as const,
  splits: [{ userId: "user-1", value: 0 }],
};

describe("expenseSchema", () => {
  it("keeps a blank actual card amount as null instead of coercing it to zero", () => {
    const parsed = expenseSchema.parse({
      ...baseExpense,
      actualConvertedAmount: "",
    });

    expect(parsed.actualConvertedAmount).toBeNull();
  });

  it("accepts a positive actual card amount", () => {
    const parsed = expenseSchema.parse({
      ...baseExpense,
      rateType: "CREDIT_CARD",
      actualConvertedAmount: 46.9,
    });

    expect(parsed.actualConvertedAmount).toBe(46.9);
  });
});
