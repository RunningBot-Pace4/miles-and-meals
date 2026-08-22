import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { expenseSplits, expenses } from "@/db/schema";
import { ExpenseForm } from "@/components/ExpenseForm";
import {
  getActiveTripContext,
} from "@/lib/active-trip";
import { effectiveConvertedAmount } from "@/lib/money";
import { requirePageSession } from "@/lib/session";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditExpensePage({ params }: Props) {
  const session = await requirePageSession();
  const { id } = await params;
  const rows = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
  const expense = rows[0];

  const activeTrip =
    await getActiveTripContext(
      session.user,
    );

  if (
    !expense ||
    !activeTrip.countries.some(
      (country) =>
        country.id ===
        expense.countryId,
    )
  ) {
    notFound();
  }

  const splits = await db
    .select({
      userId: expenseSplits.userId,
      shareAmountBase: expenseSplits.shareAmountBase,
    })
    .from(expenseSplits)
    .where(eq(expenseSplits.expenseId, id));

  const settlementTotal = effectiveConvertedAmount(
    expense.convertedAmount,
    expense.actualConvertedAmount,
  );
  const splitMode =
    expense.splitMode === "PERCENTAGE" || expense.splitMode === "EXACT"
      ? expense.splitMode
      : "EQUAL";
  const splitValues = Object.fromEntries(
    splits.map((split) => {
      if (splitMode === "PERCENTAGE") {
        const percentage =
          settlementTotal > 0
            ? (Number(split.shareAmountBase) / settlementTotal) * 100
            : 0;
        return [split.userId, percentage.toFixed(4).replace(/0+$/, "").replace(/\.$/, "")];
      }

      if (splitMode === "EXACT") {
        return [split.userId, Number(split.shareAmountBase).toFixed(2)];
      }

      return [split.userId, "0"];
    }),
  );

  const countries =
    activeTrip.countries;

  return (
      <ExpenseForm
        countries={countries}
        activeTripId={activeTrip.tripId}
        currentUserId={session.user.id}
        initial={{
          id: expense.id,
          updatedAt: expense.updatedAt.toISOString(),
          countryId: expense.countryId,
          expenseDate: expense.expenseDate,
          category: expense.category,
          description: expense.description,
          transactionCurrency: expense.transactionCurrency,
          transactionAmount: expense.transactionAmount,
          exchangeRate: expense.exchangeRate,
          rateType: expense.rateType as
            | "DEFAULT"
            | "CASH_EXCHANGE"
            | "CREDIT_CARD"
            | "MANUAL",
          actualConvertedAmount:
            expense.actualConvertedAmount &&
            Number(expense.actualConvertedAmount) > 0
              ? expense.actualConvertedAmount
              : null,
          splitMode,
          paidByUserId: expense.paidByUserId,
          paymentMethod: expense.paymentMethod,
          receiptUrl: expense.receiptUrl,
          notes: expense.notes,
          splitUserIds: splits.map((split) => split.userId),
          splitValues,
        }}
      />
  );
}
