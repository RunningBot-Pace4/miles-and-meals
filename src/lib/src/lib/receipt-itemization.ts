import { roundMoney, splitEqually } from "@/lib/money";

export type ReceiptItemizationInput = {
  title: string;
  transactionAmount: number;
  assigneeUserIds: string[];
};

export type CalculatedReceiptItem = {
  title: string;
  transactionAmount: number;
  baseAmount: number;
  assignments: Array<{ userId: string; shareAmountBase: string }>;
  synthetic?: boolean;
};

export type ReceiptItemizationResult = {
  splits: Array<{ userId: string; shareAmountBase: string }>;
  items: CalculatedReceiptItem[];
};

function cents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100);
}

function allocateCentsByWeights(totalCents: number, weights: number[]): number[] {
  if (!weights.length) return [];
  if (totalCents < 0) throw new Error("Cannot allocate a negative amount.");

  const clean = weights.map((weight) => Math.max(0, weight));
  const totalWeight = clean.reduce((sum, weight) => sum + weight, 0);

  if (totalWeight <= 0) {
    const base = Math.floor(totalCents / clean.length);
    let remaining = totalCents - base * clean.length;
    return clean.map(() => base + (remaining-- > 0 ? 1 : 0));
  }

  const raw = clean.map((weight, index) => {
    const exact = (totalCents * weight) / totalWeight;
    const floor = Math.floor(exact);
    return { index, floor, remainder: exact - floor };
  });

  let remaining = totalCents - raw.reduce((sum, row) => sum + row.floor, 0);
  const ranked = [...raw].sort(
    (left, right) => right.remainder - left.remainder || left.index - right.index,
  );
  const output = raw.map((row) => row.floor);

  for (let index = 0; remaining > 0; index = (index + 1) % ranked.length) {
    output[ranked[index].index] += 1;
    remaining -= 1;
  }

  return output;
}

export function buildReceiptItemization(
  transactionTotal: number,
  settlementBaseTotal: number,
  input: ReceiptItemizationInput[],
): ReceiptItemizationResult {
  if (!Number.isFinite(transactionTotal) || transactionTotal <= 0) {
    throw new Error("Receipt itemization needs a valid expense total.");
  }
  if (!Number.isFinite(settlementBaseTotal) || settlementBaseTotal <= 0) {
    throw new Error("Receipt itemization needs a valid trip-currency total.");
  }
  if (input.length === 0) {
    throw new Error("Add at least one receipt item before using itemized split.");
  }

  const clean = input.map((item) => ({
    title: item.title.trim().slice(0, 120),
    transactionAmount: roundMoney(item.transactionAmount),
    assigneeUserIds: [...new Set(item.assigneeUserIds.filter(Boolean))],
  }));

  for (const item of clean) {
    if (!item.title || item.transactionAmount <= 0 || item.assigneeUserIds.length === 0) {
      throw new Error("Every receipt item needs a name, positive amount and at least one traveler.");
    }
  }

  const transactionTotalCents = cents(transactionTotal);
  const itemTransactionCents = clean.map((item) => cents(item.transactionAmount));
  const itemTransactionTotalCents = itemTransactionCents.reduce((sum, value) => sum + value, 0);

  if (itemTransactionTotalCents > transactionTotalCents) {
    throw new Error("Receipt items are greater than the expense total. Review the detected lines.");
  }

  const remainingTransactionCents = transactionTotalCents - itemTransactionTotalCents;
  const targetBaseCents = cents(settlementBaseTotal);

  // Allocate the final base-currency cents across every receipt component in one
  // pass. This guarantees the stored item rows reconcile exactly with the final
  // expense total even when FX conversion creates awkward rounding fractions.
  const componentWeights = [
    ...itemTransactionCents,
    ...(remainingTransactionCents > 0 ? [remainingTransactionCents] : []),
  ];
  const componentBaseCents = allocateCentsByWeights(targetBaseCents, componentWeights);

  const resultItems: CalculatedReceiptItem[] = [];
  const userSubtotalCents = new Map<string, number>();

  clean.forEach((item, index) => {
    const itemBaseCents = componentBaseCents[index] ?? 0;
    const assignments = splitEqually(itemBaseCents / 100, item.assigneeUserIds);

    for (const assignment of assignments) {
      userSubtotalCents.set(
        assignment.userId,
        (userSubtotalCents.get(assignment.userId) ?? 0) + cents(Number(assignment.shareAmountBase)),
      );
    }

    resultItems.push({
      title: item.title,
      transactionAmount: item.transactionAmount,
      baseAmount: itemBaseCents / 100,
      assignments,
    });
  });

  if (remainingTransactionCents > 0) {
    const overheadBaseCents = componentBaseCents[clean.length] ?? 0;
    const weightedUsers = [...userSubtotalCents.entries()];
    const fallbackUsers = [...new Set(clean.flatMap((item) => item.assigneeUserIds))];
    const users = weightedUsers.length
      ? weightedUsers.map(([userId]) => userId)
      : fallbackUsers;
    const weights = weightedUsers.length
      ? weightedUsers.map(([, amountCents]) => amountCents)
      : fallbackUsers.map(() => 1);

    if (!users.length) {
      throw new Error("Choose at least one traveler for the receipt items.");
    }

    const overheadShares = allocateCentsByWeights(overheadBaseCents, weights);
    const assignments = users.map((userId, index) => {
      const shareCents = overheadShares[index] ?? 0;
      userSubtotalCents.set(
        userId,
        (userSubtotalCents.get(userId) ?? 0) + shareCents,
      );
      return {
        userId,
        shareAmountBase: (shareCents / 100).toFixed(2),
      };
    });

    resultItems.push({
      title: "Tax / service / remaining",
      transactionAmount: remainingTransactionCents / 100,
      baseAmount: overheadBaseCents / 100,
      assignments,
      synthetic: true,
    });
  }

  const splits = [...userSubtotalCents.entries()]
    .filter(([, amountCents]) => amountCents > 0)
    .map(([userId, amountCents]) => ({
      userId,
      shareAmountBase: (amountCents / 100).toFixed(2),
    }));

  const splitCents = splits.reduce(
    (sum, row) => sum + cents(Number(row.shareAmountBase)),
    0,
  );
  if (splitCents !== targetBaseCents) {
    throw new Error("Receipt itemization could not reconcile to the final trip amount.");
  }

  const itemBaseCents = resultItems.reduce((sum, item) => sum + cents(item.baseAmount), 0);
  if (itemBaseCents !== targetBaseCents) {
    throw new Error("Receipt item rows could not reconcile to the final trip amount.");
  }

  return { splits, items: resultItems };
}
