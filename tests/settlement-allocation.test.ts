import { describe, expect, it } from "vitest";
import {
  allocationTotal,
  allocationsMatch,
  getBillPaymentStatus,
  getBillRemainingAmount,
} from "@/lib/settlement-allocation";

describe("bill-level settlement allocation", () => {
  it("tracks a partial breakfast payment", () => {
    expect(getBillPaymentStatus(50, 20)).toBe("PARTIAL");
    expect(getBillRemainingAmount(50, 20)).toBe(30);
  });

  it("marks a fully allocated bill settled", () => {
    expect(getBillPaymentStatus(30, 30)).toBe("SETTLED");
    expect(getBillRemainingAmount(30, 30)).toBe(0);
  });

  it("keeps an untouched bill unpaid", () => {
    expect(getBillPaymentStatus(100, 0)).toBe("UNPAID");
    expect(getBillRemainingAmount(100, 0)).toBe(100);
  });

  it("sums a payment spanning several selected bills", () => {
    expect(
      allocationTotal([
        { expenseId: "breakfast", amount: 20 },
        { expenseId: "hotel", amount: 50 },
        { expenseId: "dinner", amount: 30 },
      ]),
    ).toBe(100);
  });



  it("tracks mixed bill states after one combined payment", () => {
    const bills = [
      { owed: 50, paid: 20 },
      { owed: 100, paid: 50 },
      { owed: 30, paid: 30 },
    ];

    expect(
      bills.map((bill) => ({
        status: getBillPaymentStatus(bill.owed, bill.paid),
        remaining: getBillRemainingAmount(bill.owed, bill.paid),
      })),
    ).toEqual([
      { status: "PARTIAL", remaining: 30 },
      { status: "PARTIAL", remaining: 50 },
      { status: "SETTLED", remaining: 0 },
    ]);
  });

  it("compares idempotent allocations independent of order", () => {
    expect(
      allocationsMatch(
        [
          { expenseId: "hotel", amount: 50 },
          { expenseId: "breakfast", amount: 20 },
        ],
        [
          { expenseId: "breakfast", amount: 20 },
          { expenseId: "hotel", amount: 50 },
        ],
      ),
    ).toBe(true);
  });

  it("detects changed allocation amounts on a reused request", () => {
    expect(
      allocationsMatch(
        [{ expenseId: "breakfast", amount: 20 }],
        [{ expenseId: "breakfast", amount: 25 }],
      ),
    ).toBe(false);
  });
});
