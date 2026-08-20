export type BudgetAmount = {
  userId: string;
  amount: number;
};

export function sumPersonalBudgets(
  budgets: BudgetAmount[],
): number {
  return Math.round(
    budgets.reduce(
      (sum, budget) =>
        sum + budget.amount,
      0,
    ) * 100,
  ) / 100;
}

export function calculateBudgetWallet(
  myBudget: number,
  myShareSpent: number,
  combinedBudget: number,
  groupExpenseTotal: number,
) {
  return {
    myRemaining:
      Math.round(
        (
          myBudget -
          myShareSpent
        ) * 100,
      ) / 100,
    groupRemaining:
      Math.round(
        (
          combinedBudget -
          groupExpenseTotal
        ) * 100,
      ) / 100,
  };
}
