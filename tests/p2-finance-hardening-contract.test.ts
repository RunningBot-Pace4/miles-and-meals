import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(path, "utf8");
}

describe("P2 finance hardening contract", () => {
  const expenseApi = source("src/app/api/expenses/route.ts");
  const ledger = source("src/lib/settlement-ledger.ts");
  const validation = source("src/lib/validation.ts");
  const offlineQueue = source("src/lib/offline-queue.ts");
  const settlementUi = source(
    "src/components/LiveSettlementWorkspace.tsx",
  );

  it("does not include receipt blobs in the expense list query", () => {
    const getStart = expenseApi.indexOf("export async function GET");
    const postStart = expenseApi.indexOf("export async function POST");
    const getSource = expenseApi.slice(getStart, postStart);

    expect(getSource).not.toContain(".select()");
    expect(getSource).not.toContain("receiptUrl: expenses.receiptUrl");
    expect(getSource).toContain("receiptReviewStatus");
  });

  it("groups payer rows once instead of filtering all payers per split", () => {
    expect(ledger).toContain("payersByExpenseId");
    expect(ledger).toContain("payersByExpenseId.get(expense.id)");
    expect(ledger).not.toContain(
      "payerRows.filter((payer) => payer.expenseId === expense.id)",
    );
  });

  it("restricts receipt links and expense dates/currencies", () => {
    expect(validation).toContain("isValidIsoDate");
    expect(validation).toContain("currencyCodeSchema");
    expect(validation).toContain("Receipt links must use http:// or https://.");
    expect(validation).toContain(".max(30)");
  });

  it("does not silently rewrite dependent offline financial allocations", () => {
    expect(offlineQueue).toContain(
      "canSafelyEditOfflineExpenseAmount",
    );
    expect(offlineQueue).toContain(
      "Amount was not changed because this offline expense",
    );
  });

  it("distinguishes explicitly allocated bill payments from unassigned direct payments", () => {
    expect(ledger).toContain("directPaid");
    expect(ledger).toContain("directRemaining");
    expect(settlementUi).toContain("Bill-specific paid");
    expect(settlementUi).toContain("balance.allocatedPaid");
    expect(settlementUi).toContain("balance.unallocatedDirectPaid");
    expect(settlementUi).toContain("expense.remainingAmount");
    expect(settlementUi).toContain("<BillSettlementAllocator");
    expect(settlementUi).toContain("Direct remaining");
    expect(settlementUi).toContain(
      "Bill-specific payments are assigned only when a traveler explicitly selects the receipts they are paying",
    );
  });
});
