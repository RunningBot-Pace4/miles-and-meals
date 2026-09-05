import { notFound } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { expenseComments, expenseItemAssignments, expenseItems, expensePayers, expenseSplits, expenses, user } from "@/db/schema";
import { ExpenseForm } from "@/components/ExpenseForm";
import { ExpenseComments } from "@/components/ExpenseComments";
import { FinancialClosePanel } from "@/components/FinancialClosePanel";
import { FullPageLink as Link } from "@/components/FullPageLink";
import {
  getActiveTripContext,
} from "@/lib/active-trip";
import { getTripFinancialState } from "@/lib/financial-close";
import { effectiveConvertedAmount } from "@/lib/money";
import { canManageTrip } from "@/lib/trip-management";
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

  const payers = await db
    .select({
      userId: expensePayers.userId,
      amountBase: expensePayers.amountBase,
    })
    .from(expensePayers)
    .where(eq(expensePayers.expenseId, id));

  const comments = await db
    .select({
      id: expenseComments.id,
      body: expenseComments.body,
      userId: expenseComments.userId,
      userName: user.name,
      createdAt: expenseComments.createdAt,
    })
    .from(expenseComments)
    .innerJoin(user, eq(expenseComments.userId, user.id))
    .where(eq(expenseComments.expenseId, id));
  const commentViews = comments.map((comment) => ({
    ...comment,
    createdAt: comment.createdAt.toISOString(),
  }));

  const storedItems = await db
    .select({
      id: expenseItems.id,
      title: expenseItems.title,
      transactionAmount: expenseItems.transactionAmount,
      createdAt: expenseItems.createdAt,
    })
    .from(expenseItems)
    .where(eq(expenseItems.expenseId, id));

  const editableItems = storedItems
    .filter((item) => item.title !== "Tax / service / remaining")
    .sort((left, right) =>
      left.createdAt.getTime() - right.createdAt.getTime() ||
      left.id.localeCompare(right.id),
    );

  const assignmentRows = editableItems.length
    ? await db
        .select({
          itemId: expenseItemAssignments.itemId,
          userId: expenseItemAssignments.userId,
        })
        .from(expenseItemAssignments)
        .where(inArray(expenseItemAssignments.itemId, editableItems.map((item) => item.id)))
    : [];

  const itemization = editableItems.map((item) => ({
    title: item.title,
    transactionAmount: Number(item.transactionAmount),
    assigneeUserIds: assignmentRows
      .filter((assignment) => assignment.itemId === item.id)
      .map((assignment) => assignment.userId),
  }));

  const settlementTotal = effectiveConvertedAmount(
    expense.convertedAmount,
    expense.actualConvertedAmount,
  );
  const splitMode =
    expense.splitMode === "PERCENTAGE" ||
    expense.splitMode === "SHARES" ||
    expense.splitMode === "EXACT"
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

      if (splitMode === "SHARES") {
        return [split.userId, Number(split.shareAmountBase).toFixed(2)];
      }

      return [split.userId, "0"];
    }),
  );

  const countries =
    activeTrip.countries;
  const [financialState, canManageFinancials] = await Promise.all([
    getTripFinancialState(activeTrip.tripId),
    activeTrip.tripId ? canManageTrip(session.user, activeTrip.tripId) : Promise.resolve(false),
  ]);

  if (financialState?.status === "CLOSED") {
    return (
      <div className="stack gap-lg">
        <div className="page-heading">
          <div>
            <p className="eyebrow">MONEY · FINAL SETTLEMENT</p>
            <h1>Edit expense</h1>
            <p className="muted">This trip is locked, so the expense ledger cannot be changed right now.</p>
          </div>
          <Link className="button secondary" href="/settlements">Back to settlement</Link>
        </div>
        <FinancialClosePanel
          initialState={financialState}
          canManage={canManageFinancials}
        />
        <ExpenseComments expenseId={id} initialComments={commentViews} readOnly />
      </div>
    );
  }

  return (
    <div className="stack gap-lg">
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
          payers: payers.length
            ? payers
            : [{ userId: expense.paidByUserId, amountBase: settlementTotal.toFixed(2) }],
          paymentMethod: expense.paymentMethod,
          receiptUrl: expense.receiptUrl,
          receiptReviewStatus: expense.receiptReviewStatus as "NOT_REQUIRED" | "NEEDS_REVIEW" | "REVIEWED",
          receiptConfidence: expense.receiptConfidence,
          notes: expense.notes,
          splitUserIds: splits.map((split) => split.userId),
          splitValues,
          itemization,
        }}
      />
      <ExpenseComments expenseId={id} initialComments={commentViews} />
    </div>
  );
}
