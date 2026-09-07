import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { effectiveConvertedAmount } from "@/lib/money";
import {
  buildCountrySettlementLedgers,
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

  const [rows, ledgers] = await Promise.all([
    db
      .select({
        id: expenses.id,
        category: expenses.category,
        convertedAmount: expenses.convertedAmount,
        actualConvertedAmount: expenses.actualConvertedAmount,
      })
      .from(expenses)
      .where(inArray(expenses.countryId, countryIds)),
    buildCountrySettlementLedgers(countryIds),
  ]);

  const categories = new Map<string, number>();

  for (const row of rows) {
    const amount = effectiveConvertedAmount(
      row.convertedAmount,
      row.actualConvertedAmount,
    );

    categories.set(
      row.category,
      (categories.get(row.category) ?? 0) + amount,
    );
  }

  const paid = new Map<string, number>();
  const owed = new Map<string, number>();
  const names = new Map<string, string>();

  for (const ledger of ledgers) {
    for (const person of ledger.people) {
      paid.set(
        person.userId,
        (paid.get(person.userId) ?? 0) + person.paid,
      );
      owed.set(
        person.userId,
        (owed.get(person.userId) ?? 0) + person.share,
      );
      names.set(person.userId, person.name);
    }
  }

  const waitingTransfers = ledgers.flatMap(
    (ledger) => ledger.waitingTransfers,
  );
  const pendingSettlements = ledgers
    .flatMap((ledger) => ledger.pendingSettlements)
    .sort((left, right) => right.sentAt.getTime() - left.sentAt.getTime());
  const settledSettlements = ledgers
    .flatMap((ledger) => ledger.settledSettlements)
    .sort((left, right) => right.sentAt.getTime() - left.sentAt.getTime());
  const smartPlans = ledgers.map((ledger) => ledger.smartPlan);

  const participantIds = new Set<string>([
    ...paid.keys(),
    ...owed.keys(),
    ...waitingTransfers.flatMap((row) => [
      row.fromUserId,
      row.toUserId,
    ]),
    ...pendingSettlements.flatMap((row) => [
      row.fromUserId,
      row.toUserId,
    ]),
    ...settledSettlements.flatMap((row) => [
      row.fromUserId,
      row.toUserId,
    ]),
  ]);

  for (const transfer of waitingTransfers) {
    names.set(transfer.fromUserId, transfer.fromName);
    names.set(transfer.toUserId, transfer.toName);
  }

  for (const settlement of [
    ...pendingSettlements,
    ...settledSettlements,
  ]) {
    names.set(settlement.fromUserId, settlement.fromName);
    names.set(settlement.toUserId, settlement.toName);
  }

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

      const totalSettlementPaid = settledPaid + paymentSent;
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
        toReceive: waitingToReceive + awaitingConfirmation,
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
    .sort((left, right) => left.name.localeCompare(right.name));

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
      .sort((left, right) => right.amount - left.amount),
    payers: [...paid.entries()]
      .map(([userId, amount]) => ({
        userId,
        name: names.get(userId) ?? "Traveler",
        amount,
      }))
      .sort((left, right) => right.amount - left.amount),
    people,
    waitingTransfers,
    pendingSettlements,
    settledSettlements,
    smartPlans,
  };
}
