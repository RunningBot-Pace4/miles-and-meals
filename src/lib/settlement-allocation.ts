export type BillPaymentStatus =
  | "UNPAID"
  | "PARTIAL"
  | "SETTLED";

export type SettlementExpenseAllocationInput = {
  expenseId: string;
  amount: number;
};

const MONEY_TOLERANCE = 0.009;

export function roundSettlementMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function getBillPaymentStatus(
  owedAmount: number,
  allocatedPaid: number,
): BillPaymentStatus {
  const owed = roundSettlementMoney(Math.max(0, owedAmount));
  const paid = roundSettlementMoney(Math.max(0, allocatedPaid));

  if (paid <= MONEY_TOLERANCE) {
    return "UNPAID";
  }

  if (paid + MONEY_TOLERANCE < owed) {
    return "PARTIAL";
  }

  return "SETTLED";
}

export function getBillRemainingAmount(
  owedAmount: number,
  allocatedPaid: number,
): number {
  return roundSettlementMoney(
    Math.max(0, owedAmount - allocatedPaid),
  );
}

export function allocationTotal(
  allocations: SettlementExpenseAllocationInput[],
): number {
  return roundSettlementMoney(
    allocations.reduce(
      (sum, allocation) => sum + allocation.amount,
      0,
    ),
  );
}

export function allocationsMatch(
  stored: SettlementExpenseAllocationInput[],
  requested: SettlementExpenseAllocationInput[],
): boolean {
  if (stored.length !== requested.length) {
    return false;
  }

  const storedByExpense = new Map(
    stored.map((allocation) => [
      allocation.expenseId,
      roundSettlementMoney(allocation.amount),
    ]),
  );

  return requested.every((allocation) => {
    const storedAmount = storedByExpense.get(allocation.expenseId);

    return (
      storedAmount !== undefined &&
      Math.abs(
        storedAmount -
          roundSettlementMoney(allocation.amount),
      ) < MONEY_TOLERANCE
    );
  });
}
