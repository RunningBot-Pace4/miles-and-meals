import type { ReceiptItemizationResult } from "@/lib/receipt-itemization";

export type ExpenseParentSignature = {
  tripId: string;
  countryId: string;
  expenseDate: string;
  category: string;
  description: string;
  transactionCurrency: string;
  transactionAmount: string;
  exchangeRate: string;
  rateType: string;
  baseCurrency: string;
  convertedAmount: string;
  actualConvertedAmount: string | null;
  splitMode: string;
  paidByUserId: string;
  paymentMethod: string | null;
  receiptUrl: string | null;
  receiptReviewStatus: string;
  receiptConfidence: number | null;
  notes: string | null;
  createdBy: string;
};

type StoredSplit = {
  userId: string;
  shareAmountBase: string;
};

type StoredPayer = {
  userId: string;
  amountBase: string;
};

type StoredItem = {
  id: string;
  title: string;
  transactionAmount: string;
  baseAmount: string;
};

type StoredAssignment = {
  itemId: string;
  userId: string;
  shareAmountBase: string;
};

function money(value: string | number): string {
  return Number(value).toFixed(2);
}

function rate(value: string | number): string {
  return Number(value).toFixed(10);
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function expenseParentMatches(
  stored: ExpenseParentSignature,
  expected: ExpenseParentSignature,
): boolean {
  return (
    stored.tripId === expected.tripId &&
    stored.countryId === expected.countryId &&
    stored.expenseDate === expected.expenseDate &&
    stored.category === expected.category &&
    stored.description === expected.description &&
    stored.transactionCurrency === expected.transactionCurrency &&
    money(stored.transactionAmount) === money(expected.transactionAmount) &&
    rate(stored.exchangeRate) === rate(expected.exchangeRate) &&
    stored.rateType === expected.rateType &&
    stored.baseCurrency === expected.baseCurrency &&
    money(stored.convertedAmount) === money(expected.convertedAmount) &&
    (stored.actualConvertedAmount === null
      ? expected.actualConvertedAmount === null
      : expected.actualConvertedAmount !== null &&
        money(stored.actualConvertedAmount) ===
          money(expected.actualConvertedAmount)) &&
    stored.splitMode === expected.splitMode &&
    stored.paidByUserId === expected.paidByUserId &&
    stored.paymentMethod === expected.paymentMethod &&
    stored.receiptUrl === expected.receiptUrl &&
    stored.receiptReviewStatus === expected.receiptReviewStatus &&
    stored.receiptConfidence === expected.receiptConfidence &&
    stored.notes === expected.notes &&
    stored.createdBy === expected.createdBy
  );
}

function splitSignature(rows: StoredSplit[]) {
  return rows
    .map((row) => [row.userId, money(row.shareAmountBase)] as const)
    .sort(([left], [right]) => left.localeCompare(right));
}

function payerSignature(rows: StoredPayer[]) {
  return rows
    .map((row) => [row.userId, money(row.amountBase)] as const)
    .sort(([left], [right]) => left.localeCompare(right));
}

function storedItemSignature(
  items: StoredItem[],
  assignments: StoredAssignment[],
) {
  const assignmentsByItem = new Map<
    string,
    Array<readonly [string, string]>
  >();

  for (const assignment of assignments) {
    const current = assignmentsByItem.get(assignment.itemId) ?? [];
    current.push([
      assignment.userId,
      money(assignment.shareAmountBase),
    ]);
    assignmentsByItem.set(assignment.itemId, current);
  }

  return items
    .map((item) => ({
      title: item.title,
      transactionAmount: money(item.transactionAmount),
      baseAmount: money(item.baseAmount),
      assignments: (assignmentsByItem.get(item.id) ?? []).sort(
        ([left], [right]) => left.localeCompare(right),
      ),
    }))
    .sort((left, right) =>
      JSON.stringify(left).localeCompare(JSON.stringify(right)),
    );
}

function expectedItemSignature(
  itemization: ReceiptItemizationResult | null,
) {
  return (itemization?.items ?? [])
    .map((item) => ({
      title: item.title,
      transactionAmount: money(item.transactionAmount),
      baseAmount: money(item.baseAmount),
      assignments: item.assignments
        .map(
          (assignment) =>
            [
              assignment.userId,
              money(assignment.shareAmountBase),
            ] as const,
        )
        .sort(([left], [right]) => left.localeCompare(right)),
    }))
    .sort((left, right) =>
      JSON.stringify(left).localeCompare(JSON.stringify(right)),
    );
}

export function expenseDerivedRowsMatch(input: {
  storedSplits: StoredSplit[];
  expectedSplits: StoredSplit[];
  storedPayers: StoredPayer[];
  expectedPayers: StoredPayer[];
  storedItems: StoredItem[];
  storedAssignments: StoredAssignment[];
  expectedItemization: ReceiptItemizationResult | null;
}): boolean {
  return (
    sameJson(
      splitSignature(input.storedSplits),
      splitSignature(input.expectedSplits),
    ) &&
    sameJson(
      payerSignature(input.storedPayers),
      payerSignature(input.expectedPayers),
    ) &&
    sameJson(
      storedItemSignature(input.storedItems, input.storedAssignments),
      expectedItemSignature(input.expectedItemization),
    )
  );
}
