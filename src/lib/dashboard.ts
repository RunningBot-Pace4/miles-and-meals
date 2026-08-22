import { inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  expenseSplits,
  expenses,
  user,
} from "@/db/schema";
import { effectiveConvertedAmount, toNumber } from "@/lib/money";
import {
  buildCountrySettlementLedger,
  type CountrySettlementTransfer,
  type SettlementRecordView,
  type SmartSettlementPlan,
} from "@/lib/settlement-ledger";

export type PersonExpenseSummary = {
  userId: string;
  name: string;
  paid: number;
  share: number;
  balanceBeforeSettlement: number;
  toPay: number;
  toReceive: number;
  paymentSent: number;
  awaitingConfirmation: number;
  settledPaid: number;
  settledReceived: number;
  totalSettlementPaid: number;
  totalSettlementReceived: number;
  confirmedBalance: number;
  ledgerBalance: number;
};

export async function buildExpenseSummary(countryIds: string[]) {
  if (countryIds.length === 0) {
    return {
      total: 0,
      categories: [] as { category: string; amount: number }[],
      payers: [] as { userId: string; name: string; amount: number }[],
      people: [] as PersonExpenseSummary[],
      waitingTransfers: [] as CountrySettlementTransfer[],
      pendingSettlements: [] as SettlementRecordView[],
      settledSettlements: [] as SettlementRecordView[],
      smartPlans: [] as SmartSettlementPlan[],
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

  const categories = new Map<string, number>();
  const paid = new Map<string, number>();

  for (const row of rows) {
    const amount = effectiveConvertedAmount(
      row.convertedAmount,
      row.actualConvertedAmount,
    );

    categories.set(
      row.category,
      (categories.get(row.category) ?? 0) + amount,
    );
    paid.set(
      row.paidByUserId,
      (paid.get(row.paidByUserId) ?? 0) + amount,
    );
  }

  const splits =
    expenseIds.length === 0
      ? []
      : await db
          .select({
            userId: expenseSplits.userId,
            shareAmountBase: expenseSplits.shareAmountBase,
          })
          .from(expenseSplits)
          .where(inArray(expenseSplits.expenseId, expenseIds));

  const owed = new Map<string, number>();

  for (const split of splits) {
    owed.set(
      split.userId,
      (owed.get(split.userId) ?? 0) + toNumber(split.shareAmountBase),
    );
  }

  const ledgers = (
    await Promise.all(countryIds.map((countryId) => buildCountrySettlementLedger(countryId)))
  ).filter((ledger) => ledger !== null);

  const waitingTransfers = ledgers.flatMap(
    (ledger) => ledger.waitingTransfers,
  );
  const pendingSettlements = ledgers
    .flatMap((ledger) => ledger.pendingSettlements)
    .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
  const settledSettlements = ledgers
    .flatMap((ledger) => ledger.settledSettlements)
    .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
  const smartPlans = ledgers.map((ledger) => ledger.smartPlan);

  const participantIds = new Set<string>([
    ...paid.keys(),
    ...owed.keys(),
    ...waitingTransfers.flatMap((row) => [row.fromUserId, row.toUserId]),
    ...pendingSettlements.flatMap((row) => [row.fromUserId, row.toUserId]),
    ...settledSettlements.flatMap((row) => [row.fromUserId, row.toUserId]),
  ]);

  const userRows =
    participantIds.size === 0
      ? []
      : await db
          .select({ id: user.id, name: user.name })
          .from(user)
          .where(inArray(user.id, [...participantIds]));
  const names = new Map<string, string>(
    userRows.map((row) => [row.id, row.name]),
  );

  const people = [...participantIds]
    .map((userId): PersonExpenseSummary => {
      const paidAmount = paid.get(userId) ?? 0;
      const shareAmount = owed.get(userId) ?? 0;

      const toPay = waitingTransfers
        .filter((row) => row.fromUserId === userId)
        .reduce((sum, row) => sum + row.amount, 0);
      const waitingToReceive = waitingTransfers
        .filter((row) => row.toUserId === userId)
        .reduce((sum, row) => sum + row.amount, 0);
      const paymentSent = pendingSettlements
        .filter((row) => row.fromUserId === userId)
        .reduce((sum, row) => sum + row.amount, 0);
      const awaitingConfirmation = pendingSettlements
        .filter((row) => row.toUserId === userId)
        .reduce((sum, row) => sum + row.amount, 0);
      const settledPaid = settledSettlements
        .filter((row) => row.fromUserId === userId)
        .reduce((sum, row) => sum + row.amount, 0);
      const settledReceived = settledSettlements
        .filter((row) => row.toUserId === userId)
        .reduce((sum, row) => sum + row.amount, 0);

      const totalSettlementPaid =
        settledPaid + paymentSent;
      const totalSettlementReceived =
        settledReceived + awaitingConfirmation;
      const confirmedBalance =
        paidAmount +
        settledPaid -
        shareAmount -
        settledReceived;
      const ledgerBalance =
        paidAmount +
        totalSettlementPaid -
        shareAmount -
        totalSettlementReceived;

      return {
        userId,
        name: names.get(userId) ?? "Traveler",
        paid: paidAmount,
        share: shareAmount,
        balanceBeforeSettlement: paidAmount - shareAmount,
        toPay,
        toReceive:
          waitingToReceive +
          awaitingConfirmation,
        paymentSent,
        awaitingConfirmation,
        settledPaid,
        settledReceived,
        totalSettlementPaid,
        totalSettlementReceived,
        confirmedBalance,
        ledgerBalance,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    total: rows.reduce(
      (sum, row) =>
        sum +
        effectiveConvertedAmount(
          row.convertedAmount,
          row.actualConvertedAmount,
        ),
      0,
    ),
    categories: [...categories.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount),
    payers: [...paid.entries()]
      .map(([userId, amount]) => ({
        userId,
        name: names.get(userId) ?? "Traveler",
        amount,
      }))
      .sort((a, b) => b.amount - a.amount),
    people,
    waitingTransfers,
    pendingSettlements,
    settledSettlements,
    smartPlans,
  };
}
