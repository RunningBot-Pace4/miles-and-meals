import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  expenseSplits,
  expenses,
  user,
} from "@/db/schema";
import { toNumber } from "@/lib/money";
import { calculateSettlements } from "@/lib/settlement";

export async function buildExpenseSummary(countryIds: string[]) {
  if (countryIds.length === 0) {
    return {
      total: 0,
      categories: [] as { category: string; amount: number }[],
      payers: [] as { userId: string; name: string; amount: number }[],
      settlements: [],
    };
  }

  const rows = await db
    .select({
      id: expenses.id,
      category: expenses.category,
      paidByUserId: expenses.paidByUserId,
      convertedAmount: expenses.convertedAmount,
      actualConvertedAmount: expenses.actualConvertedAmount,
    })
    .from(expenses)
    .where(inArray(expenses.countryId, countryIds));

  const expenseIds = rows.map((row) => row.id);
  const userRows = await db.select({ id: user.id, name: user.name }).from(user);
  const names = new Map(userRows.map((row) => [row.id, row.name]));

  const categories = new Map<string, number>();
  const paid = new Map<string, number>();

  for (const row of rows) {
    const amount = toNumber(row.actualConvertedAmount ?? row.convertedAmount);
    categories.set(row.category, (categories.get(row.category) ?? 0) + amount);
    paid.set(row.paidByUserId, (paid.get(row.paidByUserId) ?? 0) + amount);
  }

  let splits: { userId: string; shareAmountBase: string }[] = [];

  if (expenseIds.length > 0) {
    splits = await db
      .select({
        userId: expenseSplits.userId,
        shareAmountBase: expenseSplits.shareAmountBase,
      })
      .from(expenseSplits)
      .where(inArray(expenseSplits.expenseId, expenseIds));
  }

  const owed = new Map<string, number>();

  for (const split of splits) {
    owed.set(split.userId, (owed.get(split.userId) ?? 0) + toNumber(split.shareAmountBase));
  }

  const participantIds = new Set([...paid.keys(), ...owed.keys()]);
  const settlementInput = [...participantIds].map((userId) => ({
    userId,
    name: names.get(userId) ?? "Member",
    paid: paid.get(userId) ?? 0,
    owed: owed.get(userId) ?? 0,
  }));

  return {
    total: rows.reduce(
      (sum, row) =>
        sum + toNumber(row.actualConvertedAmount ?? row.convertedAmount),
      0,
    ),
    categories: [...categories.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount),
    payers: [...paid.entries()]
      .map(([userId, amount]) => ({
        userId,
        name: names.get(userId) ?? "Member",
        amount,
      }))
      .sort((a, b) => b.amount - a.amount),
    settlements: calculateSettlements(settlementInput),
  };
}
