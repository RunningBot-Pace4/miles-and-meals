import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  countries,
  expenseSplits,
  expenses,
  settlements,
  trips,
  user,
} from "@/db/schema";
import { effectiveConvertedAmount, toNumber } from "@/lib/money";
import {
  calculateDirectOutstandingObligations,
  calculateOutstandingSettlements,
  calculateSmartSettlementPlan,
  type SettlementInput,
  type SettlementTransfer,
} from "@/lib/settlement";

export type CountrySettlementTransfer = {
  countryId: string;
  countryName: string;
  tripId: string;
  tripName: string;
  currency: string;
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: number;
};


export type SmartSettlementPlan = {
  countryId: string;
  countryName: string;
  tripId: string;
  tripName: string;
  currency: string;
  originalTransfers: CountrySettlementTransfer[];
  optimizedTransfers: CountrySettlementTransfer[];
  originalTransferCount: number;
  optimizedTransferCount: number;
  transfersSaved: number;
  totalOutstanding: number;
  optimizationMode: "EXACT" | "SIMPLIFIED";
};

export type SettlementRecordView = {
  id: string;
  countryId: string;
  countryName: string;
  tripId: string;
  tripName: string;
  currency: string;
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: number;
  status: "SENT" | "SETTLED";
  sentAt: Date;
  confirmedAt: Date | null;
};

export type CountryPersonLedger = {
  userId: string;
  name: string;
  paid: number;
  share: number;
};

export type CountrySettlementLedger = {
  countryId: string;
  countryName: string;
  tripId: string;
  tripName: string;
  currency: string;
  people: CountryPersonLedger[];
  waitingTransfers: CountrySettlementTransfer[];
  pendingSettlements: SettlementRecordView[];
  settledSettlements: SettlementRecordView[];
  smartPlan: SmartSettlementPlan;
};

export async function buildCountrySettlementLedger(
  countryId: string,
): Promise<CountrySettlementLedger | null> {
  const countryRows = await db
    .select({
      countryId: countries.id,
      countryName: countries.name,
      tripId: trips.id,
      tripName: trips.name,
      currency: trips.baseCurrency,
    })
    .from(countries)
    .innerJoin(trips, eq(countries.tripId, trips.id))
    .where(eq(countries.id, countryId))
    .limit(1);

  const country = countryRows[0];

  if (!country) {
    return null;
  }

  const expenseRows = await db
    .select({
      id: expenses.id,
      paidByUserId: expenses.paidByUserId,
      convertedAmount: expenses.convertedAmount,
      actualConvertedAmount: expenses.actualConvertedAmount,
    })
    .from(expenses)
    .where(eq(expenses.countryId, countryId));

  const expenseIds = expenseRows.map((row) => row.id);

  const splitRows =
    expenseIds.length === 0
      ? []
      : await db
          .select({
            expenseId: expenseSplits.expenseId,
            userId: expenseSplits.userId,
            shareAmountBase: expenseSplits.shareAmountBase,
          })
          .from(expenseSplits)
          .where(inArray(expenseSplits.expenseId, expenseIds));

  const recordedRows = await db
    .select({
      id: settlements.id,
      fromUserId: settlements.fromUserId,
      toUserId: settlements.toUserId,
      amount: settlements.amount,
      currency: settlements.currency,
      status: settlements.status,
      sentAt: settlements.sentAt,
      confirmedAt: settlements.confirmedAt,
    })
    .from(settlements)
    .where(eq(settlements.countryId, countryId))
    .orderBy(desc(settlements.sentAt));

  const paid = new Map<string, number>();
  const owed = new Map<string, number>();

  for (const expense of expenseRows) {
    const amount = effectiveConvertedAmount(
      expense.convertedAmount,
      expense.actualConvertedAmount,
    );

    paid.set(
      expense.paidByUserId,
      (paid.get(expense.paidByUserId) ?? 0) + amount,
    );
  }

  for (const split of splitRows) {
    owed.set(
      split.userId,
      (owed.get(split.userId) ?? 0) + toNumber(split.shareAmountBase),
    );
  }

  const participantIds = new Set<string>([
    ...paid.keys(),
    ...owed.keys(),
    ...recordedRows.flatMap((row) => [row.fromUserId, row.toUserId]),
  ]);

  const namesRows =
    participantIds.size === 0
      ? []
      : await db
          .select({
            id: user.id,
            name: user.name,
          })
          .from(user)
          .where(inArray(user.id, [...participantIds]));
  const names = new Map(namesRows.map((row) => [row.id, row.name]));

  const input: SettlementInput[] = [...participantIds].map((userId) => ({
    userId,
    name: names.get(userId) ?? "Traveler",
    paid: paid.get(userId) ?? 0,
    owed: owed.get(userId) ?? 0,
  }));

  const activeRecorded = recordedRows
    .filter((row) => row.status === "SENT" || row.status === "SETTLED")
    .map((row) => ({
      fromUserId: row.fromUserId,
      toUserId: row.toUserId,
      amount: toNumber(row.amount),
    }));

  const expensePayers = new Map(
    expenseRows.map((expense) => [expense.id, expense.paidByUserId]),
  );
  const originalObligations: SettlementTransfer[] = splitRows
    .map((split): SettlementTransfer | null => {
      const payerId = expensePayers.get(split.expenseId);
      const amount = toNumber(split.shareAmountBase);

      if (!payerId || payerId === split.userId || amount <= 0.005) {
        return null;
      }

      return {
        fromUserId: split.userId,
        fromName: names.get(split.userId) ?? "Traveler",
        toUserId: payerId,
        toName: names.get(payerId) ?? "Traveler",
        amount,
      };
    })
    .filter((transfer): transfer is SettlementTransfer => transfer !== null);

  const currentOutstanding = calculateOutstandingSettlements(
    input,
    activeRecorded,
  );
  const optimizedOutstanding = calculateSmartSettlementPlan(currentOutstanding);

  // Before any settlement has started we can safely show the direct expense
  // relationships as the "before netting" comparison. Once a smart/rerouted
  // payment exists, attributing that transfer back to one original pair would
  // be arbitrary, so we use the already-reconciled plan as the comparison
  // baseline instead of presenting a misleading saving number.
  const directOutstanding =
    activeRecorded.length === 0
      ? calculateDirectOutstandingObligations(originalObligations, [])
      : currentOutstanding;

  const decorate = (transfer: SettlementTransfer): CountrySettlementTransfer => ({
    ...transfer,
    countryId: country.countryId,
    countryName: country.countryName,
    tripId: country.tripId,
    tripName: country.tripName,
    currency: country.currency,
  });

  const smartParticipantCount = new Set(
    currentOutstanding.flatMap((row) => [row.fromUserId, row.toUserId]),
  ).size;

  const smartPlan: SmartSettlementPlan = {
    countryId: country.countryId,
    countryName: country.countryName,
    tripId: country.tripId,
    tripName: country.tripName,
    currency: country.currency,
    originalTransfers: directOutstanding.map(decorate),
    optimizedTransfers: optimizedOutstanding.map(decorate),
    originalTransferCount: directOutstanding.length,
    optimizedTransferCount: optimizedOutstanding.length,
    transfersSaved: Math.max(0, directOutstanding.length - optimizedOutstanding.length),
    totalOutstanding: optimizedOutstanding.reduce((sum, row) => sum + row.amount, 0),
    optimizationMode: smartParticipantCount <= 11 ? "EXACT" : "SIMPLIFIED",
  };

  const waitingTransfers = currentOutstanding.map(decorate);

  const recordViews = recordedRows
    .filter((row) => row.status === "SENT" || row.status === "SETTLED")
    .map((row): SettlementRecordView => ({
      id: row.id,
      countryId: country.countryId,
      countryName: country.countryName,
      tripId: country.tripId,
      tripName: country.tripName,
      currency: row.currency || country.currency,
      fromUserId: row.fromUserId,
      fromName: names.get(row.fromUserId) ?? "Traveler",
      toUserId: row.toUserId,
      toName: names.get(row.toUserId) ?? "Traveler",
      amount: toNumber(row.amount),
      status: row.status === "SETTLED" ? "SETTLED" : "SENT",
      sentAt: row.sentAt,
      confirmedAt: row.confirmedAt,
    }));

  return {
    countryId: country.countryId,
    countryName: country.countryName,
    tripId: country.tripId,
    tripName: country.tripName,
    currency: country.currency,
    people: [...participantIds]
      .map((userId) => ({
        userId,
        name: names.get(userId) ?? "Traveler",
        paid: paid.get(userId) ?? 0,
        share: owed.get(userId) ?? 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    waitingTransfers,
    pendingSettlements: recordViews.filter((row) => row.status === "SENT"),
    settledSettlements: recordViews.filter((row) => row.status === "SETTLED"),
    smartPlan,
  };
}
