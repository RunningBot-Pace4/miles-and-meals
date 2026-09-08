import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(path, "utf8");
}

describe("financial concurrency hardening contract", () => {
  const expenseCreate = source("src/app/api/expenses/route.ts");
  const expenseEdit = source("src/app/api/expenses/[id]/route.ts");
  const settlement = source("src/app/api/settlements/route.ts");
  const financialClose = source("src/lib/financial-close.ts");
  const settlementButton = source(
    "src/components/SettlementActionButton.tsx",
  );
  const validation = source("src/lib/validation.ts");

  it("uses interactive transactions and trip row locks for all financial writes", () => {
    for (const file of [
      expenseCreate,
      expenseEdit,
      settlement,
      financialClose,
    ]) {
      expect(file).toContain(
        "createTransactionalDatabase",
      );
      expect(file).toContain('.for("update")');
      expect(file).toContain(".transaction(");
    }
  });

  it("compares full expense retry content instead of derived row counts", () => {
    expect(expenseCreate).toContain(
      "expenseParentMatches",
    );
    expect(expenseCreate).toContain(
      "expenseDerivedRowsMatch",
    );
    expect(expenseCreate).toContain(
      "REQUEST_ID_CONFLICT",
    );
    expect(expenseCreate).not.toContain(
      "existingSplitCount === calculatedSplits.length",
    );
  });

  it("uses compare-and-swap for expense edits", () => {
    expect(expenseEdit).toContain(
      "eq(\n                    expenses.updatedAt,\n                    current.updatedAt,",
    );
    expect(expenseEdit).toContain(
      'code: "STALE_EDIT"',
    );
  });

  it("gives settlement retries a stable request UUID", () => {
    expect(validation).toContain(
      "requestId: uuidSchema.optional()",
    );
    expect(settlementButton).toContain(
      "requestIdRef",
    );
    expect(settlementButton).toContain(
      "createSettlementRequestId",
    );
    expect(settlement).toContain(
      "REQUEST_ID_CONFLICT",
    );
    expect(settlement).toContain(
      "? { id: input.requestId }",
    );
  });

  it("validates both split and payer totals before financial close", () => {
    expect(financialClose).toContain(
      "has no split rows",
    );
    expect(financialClose).toContain(
      "has no payer rows",
    );
    expect(financialClose).toContain(
      "split total does not match",
    );
    expect(financialClose).toContain(
      "payer total does not match",
    );
  });

  it("does not turn push or activity failure into a financial API failure", () => {
    expect(expenseCreate).toContain(
      "Promise.allSettled",
    );
    expect(expenseEdit).toContain(
      "Promise.allSettled",
    );
    expect(settlement).toContain(
      "Promise.allSettled",
    );
    expect(financialClose).toContain(
      "Promise.allSettled",
    );
  });
});
