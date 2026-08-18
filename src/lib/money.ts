export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function convertedAmount(amount: number, rate: number): number {
  return roundMoney(amount * rate);
}

export function effectiveConvertedAmount(
  converted: string | number | null | undefined,
  actual: string | number | null | undefined,
): number {
  const convertedValue = toNumber(converted);
  const actualValue = toNumber(actual);

  return actualValue > 0 ? actualValue : convertedValue;
}

export function formatMoney(amount: number, currency = "MYR"): string {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export type SplitMode = "EQUAL" | "PERCENTAGE" | "EXACT";

export type RequestedSplit = {
  userId: string;
  value: number;
};

export type CalculatedSplit = {
  userId: string;
  shareAmountBase: string;
};

export function splitEqually(
  total: number,
  memberIds: string[],
): CalculatedSplit[] {
  if (memberIds.length === 0) {
    throw new Error("At least one split member is required.");
  }

  const cents = Math.round(total * 100);
  const base = Math.floor(cents / memberIds.length);
  let remainder = cents - base * memberIds.length;

  return memberIds.map((userId) => {
    const shareCents = base + (remainder-- > 0 ? 1 : 0);
    return {
      userId,
      shareAmountBase: (shareCents / 100).toFixed(2),
    };
  });
}

function ensureUniqueMembers(splits: RequestedSplit[]) {
  const uniqueIds = new Set(splits.map((split) => split.userId));

  if (uniqueIds.size !== splits.length) {
    throw new Error("A member cannot appear twice in an expense split.");
  }
}

function distributeByWeights(
  total: number,
  splits: RequestedSplit[],
  divisor: number,
): CalculatedSplit[] {
  const totalCents = Math.round(total * 100);
  let allocatedCents = 0;

  return splits.map((split, index) => {
    const isLast = index === splits.length - 1;
    const shareCents = isLast
      ? totalCents - allocatedCents
      : Math.round((totalCents * split.value) / divisor);

    allocatedCents += shareCents;

    return {
      userId: split.userId,
      shareAmountBase: (shareCents / 100).toFixed(2),
    };
  });
}

export function buildExpenseSplits(
  total: number,
  mode: SplitMode,
  splits: RequestedSplit[],
): CalculatedSplit[] {
  if (splits.length === 0) {
    throw new Error("At least one split member is required.");
  }

  ensureUniqueMembers(splits);

  if (mode === "EQUAL") {
    return splitEqually(
      total,
      splits.map((split) => split.userId),
    );
  }

  if (mode === "PERCENTAGE") {
    const percentageTotal = splits.reduce((sum, split) => sum + split.value, 0);

    if (Math.abs(percentageTotal - 100) > 0.001) {
      throw new Error("Percentage split must total exactly 100%.");
    }

    return distributeByWeights(total, splits, 100);
  }

  const requestedTotal = roundMoney(
    splits.reduce((sum, split) => sum + split.value, 0),
  );
  const expectedTotal = roundMoney(total);

  if (Math.abs(requestedTotal - expectedTotal) > 0.009) {
    throw new Error(
      `Exact split must total ${expectedTotal.toFixed(2)} in the trip base currency.`,
    );
  }

  return splits.map((split) => ({
    userId: split.userId,
    shareAmountBase: roundMoney(split.value).toFixed(2),
  }));
}
