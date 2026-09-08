import { describe, expect, it } from "vitest";
import {
  expenseDerivedRowsMatch,
  expenseParentMatches,
  type ExpenseParentSignature,
} from "@/lib/expense-idempotency";

const parent: ExpenseParentSignature = {
  tripId: "11111111-1111-4111-8111-111111111111",
  countryId: "22222222-2222-4222-8222-222222222222",
  expenseDate: "2026-09-08",
  category: "Food",
  description: "Dinner",
  transactionCurrency: "MYR",
  transactionAmount: "100.00",
  exchangeRate: "1.0000000000",
  rateType: "DEFAULT",
  baseCurrency: "MYR",
  convertedAmount: "100.00",
  actualConvertedAmount: null,
  splitMode: "EQUAL",
  paidByUserId: "alice",
  paymentMethod: null,
  receiptUrl: null,
  receiptReviewStatus: "NOT_REQUIRED",
  receiptConfidence: null,
  notes: null,
  createdBy: "alice",
};

describe("expense idempotency fingerprints", () => {
  it("rejects a reused request ID when parent financial content changes", () => {
    expect(
      expenseParentMatches(parent, {
        ...parent,
        transactionAmount: "150.00",
        convertedAmount: "150.00",
      }),
    ).toBe(false);
  });

  it("matches equivalent decimal formatting", () => {
    expect(
      expenseParentMatches(
        {
          ...parent,
          transactionAmount: "100.0",
          exchangeRate: "1",
        },
        parent,
      ),
    ).toBe(true);
  });

  it("requires payer and split values to match, not only row counts", () => {
    expect(
      expenseDerivedRowsMatch({
        storedSplits: [
          { userId: "alice", shareAmountBase: "50.00" },
          { userId: "bob", shareAmountBase: "50.00" },
        ],
        expectedSplits: [
          { userId: "alice", shareAmountBase: "40.00" },
          { userId: "bob", shareAmountBase: "60.00" },
        ],
        storedPayers: [
          { userId: "alice", amountBase: "100.00" },
        ],
        expectedPayers: [
          { userId: "alice", amountBase: "100.00" },
        ],
        storedItems: [],
        storedAssignments: [],
        expectedItemization: null,
      }),
    ).toBe(false);
  });

  it("matches itemization independent of database row order", () => {
    expect(
      expenseDerivedRowsMatch({
        storedSplits: [
          { userId: "alice", shareAmountBase: "50.00" },
          { userId: "bob", shareAmountBase: "50.00" },
        ],
        expectedSplits: [
          { userId: "bob", shareAmountBase: "50.00" },
          { userId: "alice", shareAmountBase: "50.00" },
        ],
        storedPayers: [
          { userId: "alice", amountBase: "100.00" },
        ],
        expectedPayers: [
          { userId: "alice", amountBase: "100.00" },
        ],
        storedItems: [
          {
            id: "item-a",
            title: "Meal",
            transactionAmount: "100.00",
            baseAmount: "100.00",
          },
        ],
        storedAssignments: [
          {
            itemId: "item-a",
            userId: "bob",
            shareAmountBase: "50.00",
          },
          {
            itemId: "item-a",
            userId: "alice",
            shareAmountBase: "50.00",
          },
        ],
        expectedItemization: {
          splits: [
            { userId: "alice", shareAmountBase: "50.00" },
            { userId: "bob", shareAmountBase: "50.00" },
          ],
          items: [
            {
              title: "Meal",
              transactionAmount: 100,
              baseAmount: 100,
              assignments: [
                { userId: "alice", shareAmountBase: "50.00" },
                { userId: "bob", shareAmountBase: "50.00" },
              ],
            },
          ],
        },
      }),
    ).toBe(true);
  });
});
