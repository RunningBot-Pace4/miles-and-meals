import {
  desc,
  eq,
  inArray,
  sql,
} from "drizzle-orm";
import { db } from "@/db";
import {
  countries,
  expensePayers,
  expenseSplits,
  expenses,
  user,
} from "@/db/schema";
import {
  listAccessibleCountries,
  type SessionUser,
} from "@/lib/access";
import {
  effectiveConvertedAmount,
  toNumber,
} from "@/lib/money";

export type ExpenseLiveSplit = {
  userId: string;
  name: string;
  share: number;
};

export type ExpenseLivePayer = {
  userId: string;
  name: string;
  amount: number;
};

export type ExpenseLiveRow = {
  id: string;
  expenseDate: string;
  description: string;
  category: string;
  transactionCurrency: string;
  transactionAmount: string;
  exchangeRate: string;
  convertedAmount: string;
  actualConvertedAmount: string | null;
  baseCurrency: string;
  countryName: string;
  tripName: string;
  paidByName: string;
  payers: ExpenseLivePayer[];
  hasReceipt: boolean;
  splits: ExpenseLiveSplit[];
};

export type ExpenseLiveData = {
  rows: ExpenseLiveRow[];
  total: number;
  myShare: number;
  baseCurrency: string;
};

export async function loadExpenseLiveData(
  currentUser: SessionUser,
  tripId = "",
): Promise<ExpenseLiveData> {
  const allCountries =
    await listAccessibleCountries(
      currentUser,
    );
  const allowedCountries =
    tripId
      ? allCountries.filter(
          (country) =>
            country.tripId ===
            tripId,
        )
      : allCountries;
  const countryIds =
    allowedCountries.map(
      (country) => country.id,
    );

  if (countryIds.length === 0) {
    return {
      rows: [],
      total: 0,
      myShare: 0,
      baseCurrency: "MYR",
    };
  }

  const countryInfo = new Map<
    string,
    {
      name: string;
      tripName: string;
    }
  >(
    allowedCountries.map(
      (country) => [
        country.id,
        {
          name: country.name,
          tripName:
            country.tripName,
        },
      ],
    ),
  );

  const rows = await db
    .select({
      id: expenses.id,
      expenseDate:
        expenses.expenseDate,
      description:
        expenses.description,
      category:
        expenses.category,
      transactionCurrency:
        expenses.transactionCurrency,
      transactionAmount:
        expenses.transactionAmount,
      exchangeRate:
        expenses.exchangeRate,
      convertedAmount:
        expenses.convertedAmount,
      actualConvertedAmount:
        expenses.actualConvertedAmount,
      baseCurrency:
        expenses.baseCurrency,
      countryId:
        expenses.countryId,
      countryName:
        countries.name,
      paidByName:
        user.name,
      hasReceipt: sql<boolean>`
        coalesce(${expenses.receiptUrl}, '') <> ''
      `,
    })
    .from(expenses)
    .innerJoin(
      countries,
      eq(
        expenses.countryId,
        countries.id,
      ),
    )
    .innerJoin(
      user,
      eq(
        expenses.paidByUserId,
        user.id,
      ),
    )
    .where(
      inArray(
        expenses.countryId,
        countryIds,
      ),
    )
    .orderBy(
      desc(expenses.expenseDate),
      desc(expenses.createdAt),
    );

  const expenseIds =
    rows.map((row) => row.id);

  const [splitRows, payerRows] =
    expenseIds.length === 0
      ? [[], []] as const
      : await Promise.all([
          db
            .select({
              expenseId: expenseSplits.expenseId,
              userId: expenseSplits.userId,
              name: user.name,
              shareAmountBase: expenseSplits.shareAmountBase,
            })
            .from(expenseSplits)
            .innerJoin(user, eq(expenseSplits.userId, user.id))
            .where(inArray(expenseSplits.expenseId, expenseIds)),
          db
            .select({
              expenseId: expensePayers.expenseId,
              userId: expensePayers.userId,
              name: user.name,
              amountBase: expensePayers.amountBase,
            })
            .from(expensePayers)
            .innerJoin(user, eq(expensePayers.userId, user.id))
            .where(inArray(expensePayers.expenseId, expenseIds)),
        ]);

  const splitsByExpense = new Map<
    string,
    ExpenseLiveSplit[]
  >();
  const payersByExpense = new Map<string, ExpenseLivePayer[]>();

  for (const payer of payerRows) {
    const current = payersByExpense.get(payer.expenseId) ?? [];
    current.push({
      userId: payer.userId,
      name: payer.name,
      amount: toNumber(payer.amountBase),
    });
    payersByExpense.set(payer.expenseId, current);
  }

  let myShare = 0;

  for (const split of splitRows) {
    const share = toNumber(
      split.shareAmountBase,
    );
    const current =
      splitsByExpense.get(
        split.expenseId,
      ) ?? [];

    current.push({
      userId: split.userId,
      name: split.name,
      share,
    });

    splitsByExpense.set(
      split.expenseId,
      current,
    );

    if (
      split.userId ===
      currentUser.id
    ) {
      myShare += share;
    }
  }

  const total = rows.reduce(
    (sum, row) =>
      sum +
      effectiveConvertedAmount(
        row.convertedAmount,
        row.actualConvertedAmount,
      ),
    0,
  );

  return {
    rows: rows.map((row) => ({
      id: row.id,
      expenseDate:
        row.expenseDate,
      description:
        row.description,
      category: row.category,
      transactionCurrency:
        row.transactionCurrency,
      transactionAmount:
        row.transactionAmount,
      exchangeRate:
        row.exchangeRate,
      convertedAmount:
        row.convertedAmount,
      actualConvertedAmount:
        row.actualConvertedAmount,
      baseCurrency:
        row.baseCurrency,
      countryName:
        row.countryName,
      tripName:
        countryInfo.get(
          row.countryId,
        )?.tripName ?? "Trip",
      paidByName:
        (payersByExpense.get(row.id)?.length ?? 0) > 1
          ? "Multiple travelers"
          : row.paidByName,
      payers: payersByExpense.get(row.id) ?? [],
      hasReceipt:
        Boolean(row.hasReceipt),
      splits:
        splitsByExpense.get(
          row.id,
        ) ?? [],
    })),
    total,
    myShare,
    baseCurrency:
      allowedCountries[0]
        ?.baseCurrency ?? "MYR",
  };
}
