import { roundMoney } from "@/lib/money";

export type RequestedPayer = {
  userId: string;
  value: number;
};

export type CalculatedPayer = {
  userId: string;
  amountBase: string;
};

export function buildExpensePayers(
  total: number,
  primaryPayerUserId: string,
  requested: RequestedPayer[],
): CalculatedPayer[] {
  const expected = roundMoney(total);

  if (!requested.length) {
    return [{ userId: primaryPayerUserId, amountBase: expected.toFixed(2) }];
  }

  const ids = new Set(requested.map((payer) => payer.userId));
  if (ids.size !== requested.length) {
    throw new Error("A traveler cannot appear twice in the payer list.");
  }

  if (requested.some((payer) => !Number.isFinite(payer.value) || payer.value <= 0)) {
    throw new Error("Enter a valid amount above zero for every payer.");
  }

  const entered = roundMoney(requested.reduce((sum, payer) => sum + payer.value, 0));
  if (Math.abs(entered - expected) > 0.009) {
    throw new Error(`Payer contributions must total ${expected.toFixed(2)} in the trip base currency.`);
  }

  return requested.map((payer) => ({
    userId: payer.userId,
    amountBase: roundMoney(payer.value).toFixed(2),
  }));
}
