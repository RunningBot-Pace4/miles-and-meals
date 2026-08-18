import { describe, expect, it } from "vitest";
import { expenseSchema } from "@/lib/validation";

function baseExpense() {
  return {
    countryId: "11111111-1111-4111-8111-111111111111",
    expenseDate: "2026-08-18",
    category: "Food",
    description: "Dinner",
    transactionCurrency: "VND",
    transactionAmount: 100000,
    exchangeRate: 0.0001579,
    rateType: "CREDIT_CARD" as const,
    paidByUserId: "user-1",
    paymentMethod: "",
    receiptUrl: "",
    notes: "",
    splitMode: "EQUAL" as const,
    splits: [{ userId: "user-1", value: 0 }],
  };
}

describe("optional actual card charge", () => {
  it("treats a blank actual card charge as null", () => {
    const parsed = expenseSchema.parse({
      ...baseExpense(),
      actualConvertedAmount: "",
    });

    expect(parsed.actualConvertedAmount).toBeNull();
  });

  it("treats legacy zero actual card charge as null", () => {
    const parsed = expenseSchema.parse({
      ...baseExpense(),
      actualConvertedAmount: "0.00",
    });

    expect(parsed.actualConvertedAmount).toBeNull();
  });

  it("keeps a positive actual card charge", () => {
    const parsed = expenseSchema.parse({
      ...baseExpense(),
      actualConvertedAmount: "46.58",
    });

    expect(parsed.actualConvertedAmount).toBe(46.58);
  });
});
