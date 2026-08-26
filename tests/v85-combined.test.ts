import { describe, expect, it } from "vitest";
import { buildExpensePayers } from "@/lib/expense-payers";
import { parsePlanConfirmation } from "@/lib/plan-import";
import { expenseSchema, settlementActionSchema, travelItemSchema } from "@/lib/validation";

describe("v85 combined finance", () => {
  it("validates multiple payer contributions", () => {
    expect(buildExpensePayers(120, "a", [
      { userId: "a", value: 70 },
      { userId: "b", value: 50 },
    ])).toEqual([
      { userId: "a", amountBase: "70.00" },
      { userId: "b", amountBase: "50.00" },
    ]);
    expect(() => buildExpensePayers(120, "a", [
      { userId: "a", value: 60 },
      { userId: "b", value: 50 },
    ])).toThrow(/must total 120.00/i);
  });

  it("accepts weighted shares and partial settlements", () => {
    const expense = expenseSchema.parse({
      countryId: "11111111-1111-4111-8111-111111111111",
      expenseDate: "2026-08-26",
      category: "Food",
      description: "Dinner",
      transactionCurrency: "MYR",
      transactionAmount: 100,
      exchangeRate: 1,
      rateType: "DEFAULT",
      paidByUserId: "a",
      payers: [{ userId: "a", value: 60 }, { userId: "b", value: 40 }],
      splitMode: "SHARES",
      splits: [{ userId: "a", value: 2 }, { userId: "b", value: 1 }],
    });
    expect(expense.splitMode).toBe("SHARES");
    expect(expense.payers).toHaveLength(2);
    expect(settlementActionSchema.parse({
      countryId: "11111111-1111-4111-8111-111111111111",
      counterpartyUserId: "b",
      action: "MARK_PAID",
      amount: 25,
    }).amount).toBe(25);
  });
});

describe("v84 reviewed plan import", () => {
  it("extracts useful fields but requires a review draft", () => {
    const draft = parsePlanConfirmation(`
      Flight confirmation
      Airline: Example Air
      Booking reference: ABC123
      Departure 29 August 2026 at 8:15 PM
      Destination: Da Nang Airport
    `);
    expect(draft.itemDate).toBe("2026-08-29");
    expect(draft.itemTime).toBe("20:15");
    expect(draft.confirmationNo).toBe("ABC123");
    expect(draft.provider).toBe("Example Air");
    expect(draft.notes).toMatch(/Original message was not stored/i);
  });

  it("accepts checklist and packing planner items", () => {
    for (const itemType of ["CHECKLIST", "PACKING"] as const) {
      expect(travelItemSchema.parse({
        countryId: "11111111-1111-4111-8111-111111111111",
        itemType,
        title: "Passport",
      }).itemType).toBe(itemType);
    }
  });
});
