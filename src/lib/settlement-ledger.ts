import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  countries,
  expensePayers,
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

export type SmartSettlementExpenseLine = {
  expenseId: string;
  expenseDate: string;
  description: string;
  category: string;
  payerUserId: string;
  payerName: string;
  participantUserId: string;
  participantName: string;
  shareAmount: number;
  expenseTotal: number;
  currency: string;
};

export type SmartSettlementOriginalBalance = {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: number;
  expenseCount: number;
  expenses: SmartSettlementExpenseLine[];
};

export type SmartSettlementPaymentLine = {
  id: string;
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: number;
  currency: string;
  status: "SENT" | "SETTLED";
  sentAt: string;
  confirmedAt: string | null;
};

export type SmartSettlementNetPosition = {
  userId: string;
  name: string;
  grossOwes: number;
  grossReceives: number;
  recordedSent: number;
  recordedReceived: number;
  remainingNet: number;
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
  originalExpenseBalances: SmartSettlementOriginalBalance[];
  recordedPayments: SmartSettlementPaymentLine[];
  netPositions: SmartSettlementNetPosition[];
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

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function directedKey(fromUserId: string, toUserId: string): string {
  return `${fromUserId}\u0000${toUserId}`;
}

export async function buildCountrySettlementLedgers(
  countryIds: string[],
): Promise<CountrySettlementLedger[]> {
  const uniqueCountryIds = [...new Set(countryIds)];

  if (uniqueCountryIds.length === 0) {
    return [];
  }

  const [countryRows, expenseRows, recordedRows] = await Promise.all([
    db
      .select({
        countryId: countries.id,
        countryName: countries.name,
        tripId: trips.id,
        tripName: trips.name,
        currency: trips.baseCurrency,
      })
      .from(countries)
      .innerJoin(trips, eq(countries.tripId, trips.id))
      .where(inArray(countries.id, uniqueCountryIds)),
    db
      .select({
        id: expenses.id,
        countryId: expenses.countryId,
        expenseDate: expenses.expenseDate,
        category: expenses.category,
        description: expenses.description,
        paidByUserId: expenses.paidByUserId,
        convertedAmount: expenses.convertedAmount,
        actualConvertedAmount: expenses.actualConvertedAmount,
      })
      .from(expenses)
      .where(inArray(expenses.countryId, uniqueCountryIds)),
    db
      .select({
        id: settlements.id,
        countryId: settlements.countryId,
        fromUserId: settlements.fromUserId,
        toUserId: settlements.toUserId,
        amount: settlements.amount,
        currency: settlements.currency,
        status: settlements.status,
        sentAt: settlements.sentAt,
        confirmedAt: settlements.confirmedAt,
      })
      .from(settlements)
      .where(inArray(settlements.countryId, uniqueCountryIds))
      .orderBy(desc(settlements.sentAt)),
  ]);

  const expenseIds = expenseRows.map((row) => row.id);
  const [splitRows, payerRows] =
    expenseIds.length === 0
      ? [[], []] as const
      : await Promise.all([
          db
            .select({
              expenseId: expenseSplits.expenseId,
              userId: expenseSplits.userId,
              shareAmountBase: expenseSplits.shareAmountBase,
            })
            .from(expenseSplits)
            .where(inArray(expenseSplits.expenseId, expenseIds)),
          db
            .select({
              expenseId: expensePayers.expenseId,
              userId: expensePayers.userId,
              amountBase: expensePayers.amountBase,
            })
            .from(expensePayers)
            .where(inArray(expensePayers.expenseId, expenseIds)),
        ]);

  const participantIds = new Set<string>();

  for (const expense of expenseRows) {
    participantIds.add(expense.paidByUserId);
  }

  for (const split of splitRows) {
    participantIds.add(split.userId);
  }

  for (const payer of payerRows) {
    participantIds.add(payer.userId);
  }

  for (const settlement of recordedRows) {
    participantIds.add(settlement.fromUserId);
    participantIds.add(settlement.toUserId);
  }

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

  const countriesById = new Map(
    countryRows.map((country) => [country.countryId, country]),
  );
  const expensesByCountry = new Map<
    string,
    typeof expenseRows
  >();
  const settlementsByCountry = new Map<
    string,
    typeof recordedRows
  >();
  const splitsByExpense = new Map<
    string,
    Array<(typeof splitRows)[number]>
  >();
  const payersByExpense = new Map<
    string,
    Array<(typeof payerRows)[number]>
  >();

  for (const expense of expenseRows) {
    const rows = expensesByCountry.get(expense.countryId) ?? [];
    rows.push(expense);
    expensesByCountry.set(expense.countryId, rows);
  }

  for (const settlement of recordedRows) {
    const rows = settlementsByCountry.get(settlement.countryId) ?? [];
    rows.push(settlement);
    settlementsByCountry.set(settlement.countryId, rows);
  }

  for (const split of splitRows) {
    const rows = splitsByExpense.get(split.expenseId) ?? [];
    rows.push(split);
    splitsByExpense.set(split.expenseId, rows);
  }

  for (const payer of payerRows) {
    const rows = payersByExpense.get(payer.expenseId) ?? [];
    rows.push(payer);
    payersByExpense.set(payer.expenseId, rows);
  }

  return uniqueCountryIds.flatMap((countryId): CountrySettlementLedger[] => {
    const country = countriesById.get(countryId);

    if (!country) {
      return [];
    }

    const countryExpenseRows = expensesByCountry.get(countryId) ?? [];
    const countryRecordedRows = settlementsByCountry.get(countryId) ?? [];
    const countrySplitRows = countryExpenseRows.flatMap(
      (expense) => splitsByExpense.get(expense.id) ?? [],
    );
    const countryPayerRows = countryExpenseRows.flatMap(
      (expense) => payersByExpense.get(expense.id) ?? [],
    );

    const paid = new Map<string, number>();
    const owed = new Map<string, number>();
    const expensesWithPayerRows = new Set(
      countryPayerRows.map((row) => row.expenseId),
    );

    for (const payer of countryPayerRows) {
      paid.set(
        payer.userId,
        (paid.get(payer.userId) ?? 0) + toNumber(payer.amountBase),
      );
    }

    for (const expense of countryExpenseRows) {
      if (expensesWithPayerRows.has(expense.id)) {
        continue;
      }

      const amount = effectiveConvertedAmount(
        expense.convertedAmount,
        expense.actualConvertedAmount,
      );

      paid.set(
        expense.paidByUserId,
        (paid.get(expense.paidByUserId) ?? 0) + amount,
      );
    }

    for (const split of countrySplitRows) {
      owed.set(
        split.userId,
        (owed.get(split.userId) ?? 0) + toNumber(split.shareAmountBase),
      );
    }

    const countryParticipantIds = new Set<string>([
      ...paid.keys(),
      ...owed.keys(),
      ...countryRecordedRows.flatMap((row) => [
        row.fromUserId,
        row.toUserId,
      ]),
    ]);

    const input: SettlementInput[] = [...countryParticipantIds].map(
      (userId) => ({
        userId,
        name: names.get(userId) ?? "Traveler",
        paid: paid.get(userId) ?? 0,
        owed: owed.get(userId) ?? 0,
      }),
    );

    const activeRecordedRows = countryRecordedRows.filter(
      (row) => row.status === "SENT" || row.status === "SETTLED",
    );
    const activeRecorded = activeRecordedRows.map((row) => ({
      fromUserId: row.fromUserId,
      toUserId: row.toUserId,
      amount: toNumber(row.amount),
    }));

    const expenseById = new Map(
      countryExpenseRows.map((expense) => [expense.id, expense]),
    );
    const originalExpenseLines: SmartSettlementExpenseLine[] =
      countrySplitRows.flatMap((split): SmartSettlementExpenseLine[] => {
        const expense = expenseById.get(split.expenseId);
        const participantShare = toNumber(split.shareAmountBase);

        if (!expense || participantShare <= 0.005) {
          return [];
        }

        const expenseTotal = effectiveConvertedAmount(
          expense.convertedAmount,
          expense.actualConvertedAmount,
        );
        const storedPayers = payersByExpense.get(expense.id) ?? [];
        const payers = storedPayers.length
          ? storedPayers.map((payer) => ({
              userId: payer.userId,
              amount: toNumber(payer.amountBase),
            }))
          : [
              {
                userId: expense.paidByUserId,
                amount: expenseTotal,
              },
            ];

        return payers.flatMap((payer) => {
          if (
            payer.userId === split.userId ||
            expenseTotal <= 0
          ) {
            return [];
          }

          const amount = roundMoney(
            participantShare * (payer.amount / expenseTotal),
          );

          if (amount <= 0.005) {
            return [];
          }

          return [
            {
              expenseId: expense.id,
              expenseDate: expense.expenseDate,
              description: expense.description,
              category: expense.category,
              payerUserId: payer.userId,
              payerName: names.get(payer.userId) ?? "Traveler",
              participantUserId: split.userId,
              participantName: names.get(split.userId) ?? "Traveler",
              shareAmount: amount,
              expenseTotal,
              currency: country.currency,
            },
          ];
        });
      });

    const originalObligations: SettlementTransfer[] =
      originalExpenseLines.map((line) => ({
        fromUserId: line.participantUserId,
        fromName: line.participantName,
        toUserId: line.payerUserId,
        toName: line.payerName,
        amount: line.shareAmount,
      }));

    const originalBalanceMap = new Map<
      string,
      SmartSettlementOriginalBalance
    >();

    for (const line of originalExpenseLines) {
      const key = directedKey(
        line.participantUserId,
        line.payerUserId,
      );
      const existing = originalBalanceMap.get(key);

      if (existing) {
        existing.amount = roundMoney(existing.amount + line.shareAmount);
        existing.expenseCount += 1;
        existing.expenses.push(line);
        continue;
      }

      originalBalanceMap.set(key, {
        fromUserId: line.participantUserId,
        fromName: line.participantName,
        toUserId: line.payerUserId,
        toName: line.payerName,
        amount: roundMoney(line.shareAmount),
        expenseCount: 1,
        expenses: [line],
      });
    }

    const originalExpenseBalances = [...originalBalanceMap.values()]
      .map((balance) => ({
        ...balance,
        expenses: [...balance.expenses].sort((left, right) =>
          right.expenseDate.localeCompare(left.expenseDate),
        ),
      }))
      .sort((left, right) => {
        if (left.fromName !== right.fromName) {
          return left.fromName.localeCompare(right.fromName);
        }

        return left.toName.localeCompare(right.toName);
      });

    const currentOutstanding = calculateOutstandingSettlements(
      input,
      activeRecorded,
    );
    const optimizedOutstanding = calculateSmartSettlementPlan(currentOutstanding);

    const directOutstanding =
      activeRecorded.length === 0
        ? calculateDirectOutstandingObligations(
            originalObligations,
            [],
          )
        : currentOutstanding;

    const decorate = (
      transfer: SettlementTransfer,
    ): CountrySettlementTransfer => ({
      ...transfer,
      countryId: country.countryId,
      countryName: country.countryName,
      tripId: country.tripId,
      tripName: country.tripName,
      currency: country.currency,
    });

    const smartParticipantCount = new Set(
      currentOutstanding.flatMap((row) => [
        row.fromUserId,
        row.toUserId,
      ]),
    ).size;

    const recordedPayments: SmartSettlementPaymentLine[] =
      activeRecordedRows.map((row) => ({
        id: row.id,
        fromUserId: row.fromUserId,
        fromName: names.get(row.fromUserId) ?? "Traveler",
        toUserId: row.toUserId,
        toName: names.get(row.toUserId) ?? "Traveler",
        amount: toNumber(row.amount),
        currency: row.currency || country.currency,
        status: row.status === "SETTLED" ? "SETTLED" : "SENT",
        sentAt: row.sentAt.toISOString(),
        confirmedAt: row.confirmedAt?.toISOString() ?? null,
      }));

    const grossOwes = new Map<string, number>();
    const grossReceives = new Map<string, number>();
    const recordedSent = new Map<string, number>();
    const recordedReceived = new Map<string, number>();

    for (const obligation of originalObligations) {
      grossOwes.set(
        obligation.fromUserId,
        (grossOwes.get(obligation.fromUserId) ?? 0) + obligation.amount,
      );
      grossReceives.set(
        obligation.toUserId,
        (grossReceives.get(obligation.toUserId) ?? 0) + obligation.amount,
      );
    }

    for (const payment of activeRecordedRows) {
      const amount = toNumber(payment.amount);
      recordedSent.set(
        payment.fromUserId,
        (recordedSent.get(payment.fromUserId) ?? 0) + amount,
      );
      recordedReceived.set(
        payment.toUserId,
        (recordedReceived.get(payment.toUserId) ?? 0) + amount,
      );
    }

    const netPositions: SmartSettlementNetPosition[] =
      [...countryParticipantIds]
        .map((userId) => {
          const owes = grossOwes.get(userId) ?? 0;
          const receives = grossReceives.get(userId) ?? 0;
          const sent = recordedSent.get(userId) ?? 0;
          const received = recordedReceived.get(userId) ?? 0;

          return {
            userId,
            name: names.get(userId) ?? "Traveler",
            grossOwes: roundMoney(owes),
            grossReceives: roundMoney(receives),
            recordedSent: roundMoney(sent),
            recordedReceived: roundMoney(received),
            remainingNet: roundMoney(receives - owes + sent - received),
          };
        })
        .sort((left, right) => left.name.localeCompare(right.name));

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
      transfersSaved: Math.max(
        0,
        directOutstanding.length - optimizedOutstanding.length,
      ),
      totalOutstanding: optimizedOutstanding.reduce(
        (sum, row) => sum + row.amount,
        0,
      ),
      optimizationMode:
        smartParticipantCount <= 11 ? "EXACT" : "SIMPLIFIED",
      originalExpenseBalances,
      recordedPayments,
      netPositions,
    };

    const waitingTransfers = currentOutstanding.map(decorate);
    const recordViews = activeRecordedRows.map(
      (row): SettlementRecordView => ({
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
      }),
    );

    return [
      {
        countryId: country.countryId,
        countryName: country.countryName,
        tripId: country.tripId,
        tripName: country.tripName,
        currency: country.currency,
        people: [...countryParticipantIds]
          .map((userId) => ({
            userId,
            name: names.get(userId) ?? "Traveler",
            paid: paid.get(userId) ?? 0,
            share: owed.get(userId) ?? 0,
          }))
          .sort((left, right) => left.name.localeCompare(right.name)),
        waitingTransfers,
        pendingSettlements: recordViews.filter(
          (row) => row.status === "SENT",
        ),
        settledSettlements: recordViews.filter(
          (row) => row.status === "SETTLED",
        ),
        smartPlan,
      },
    ];
  });
}

export async function buildCountrySettlementLedger(
  countryId: string,
): Promise<CountrySettlementLedger | null> {
  const [ledger] = await buildCountrySettlementLedgers([countryId]);
  return ledger ?? null;
}
