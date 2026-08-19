import { FullPageLink as Link } from "@/components/FullPageLink";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { countries, expenseSplits, expenses, user } from "@/db/schema";
import { DeleteExpenseButton } from "@/components/DeleteExpenseButton";
import { ReceiptViewerButton } from "@/components/ReceiptViewerButton";
import { listAccessibleCountries } from "@/lib/access";
import { effectiveConvertedAmount, formatMoney, toNumber } from "@/lib/money";
import { requirePageSession } from "@/lib/session";

export default async function ExpensesPage() {
  const session = await requirePageSession();
  const allowedCountries = await listAccessibleCountries(session.user);
  const countryIds = allowedCountries.map((country) => country.id);

  const rows =
    countryIds.length === 0
      ? []
      : await db
          .select({
            id: expenses.id,
            expenseDate: expenses.expenseDate,
            description: expenses.description,
            category: expenses.category,
            transactionCurrency: expenses.transactionCurrency,
            transactionAmount: expenses.transactionAmount,
            exchangeRate: expenses.exchangeRate,
            convertedAmount: expenses.convertedAmount,
            actualConvertedAmount: expenses.actualConvertedAmount,
            baseCurrency: expenses.baseCurrency,
            countryName: countries.name,
            paidByName: user.name,
            hasReceipt: sql<boolean>`
              coalesce(${expenses.receiptUrl}, '') <> ''
            `,
          })
          .from(expenses)
          .innerJoin(countries, eq(expenses.countryId, countries.id))
          .innerJoin(user, eq(expenses.paidByUserId, user.id))
          .where(inArray(expenses.countryId, countryIds))
          .orderBy(desc(expenses.expenseDate), desc(expenses.createdAt));

  const expenseIds = rows.map((row) => row.id);
  const total = rows.reduce(
    (sum, row) =>
      sum +
      effectiveConvertedAmount(
        row.convertedAmount,
        row.actualConvertedAmount,
      ),
    0,
  );

  const splitRows =
    expenseIds.length === 0
      ? []
      : await db
          .select({
            expenseId: expenseSplits.expenseId,
            userId: expenseSplits.userId,
            name: user.name,
            shareAmountBase: expenseSplits.shareAmountBase,
          })
          .from(expenseSplits)
          .innerJoin(user, eq(expenseSplits.userId, user.id))
          .where(inArray(expenseSplits.expenseId, expenseIds));

  const myShare = splitRows
    .filter((split) => split.userId === session.user.id)
    .reduce(
      (sum, split) => sum + toNumber(split.shareAmountBase),
      0,
    );

  const splitsByExpense = new Map<
    string,
    { userId: string; name: string; share: number }[]
  >();

  for (const split of splitRows) {
    const current = splitsByExpense.get(split.expenseId) ?? [];
    current.push({
      userId: split.userId,
      name: split.name,
      share: toNumber(split.shareAmountBase),
    });
    splitsByExpense.set(split.expenseId, current);
  }

  const baseCurrency = allowedCountries[0]?.baseCurrency ?? "MYR";

  return (
    <div className="stack gap-lg">
      <div className="page-heading">
        <div>
          <p className="eyebrow">MONEY</p>
          <h1>All trip expenses</h1>
          <p className="muted">
            See every accessible expense, who paid, and the stored FX amount.
          </p>
        </div>
        <Link className="button primary" href="/expenses/new">
          + Add
        </Link>
      </div>

      <section className="expense-overview-grid">
        <article className="expense-overview-card">
          <span>Trip expenses</span>
          <strong>{formatMoney(total, baseCurrency)}</strong>
          <small>Across countries you can access</small>
        </article>
        <article className="expense-overview-card personal">
          <span>Your personal share</span>
          <strong>{formatMoney(myShare, baseCurrency)}</strong>
          <small>Your included share of these expenses</small>
        </article>
        <Link className="expense-overview-card settle-link" href="/settlements">
          <span>Settle Up</span>
          <strong>Paid · Waiting · Received</strong>
          <small>Track repayments without typing amounts</small>
        </Link>
      </section>

      <section className="card-list">
        {rows.length ? (
          rows.map((expense) => {
            const displayAmount = effectiveConvertedAmount(
              expense.convertedAmount,
              expense.actualConvertedAmount,
            );

            return (
              <article className="expense-card" key={expense.id}>
                <div className="expense-main">
                  <div>
                    <p className="eyebrow">
                      {expense.countryName} · {expense.category}
                    </p>
                    <h2>{expense.description}</h2>
                    <p className="muted">
                      {expense.expenseDate} · Paid by {expense.paidByName}
                    </p>
                  </div>
                  <strong>
                    {formatMoney(displayAmount, expense.baseCurrency)}
                  </strong>
                </div>
                <div className="expense-meta">
                  <span>
                    {expense.transactionCurrency} {expense.transactionAmount}
                  </span>
                  <span>FX {expense.exchangeRate}</span>
                  {expense.actualConvertedAmount ? (
                    <span className="badge">Actual charge</span>
                  ) : null}
                </div>
                <div className="expense-share-summary">
                  <span>Personal shares</span>
                  <div>
                    {(splitsByExpense.get(expense.id) ?? []).map((split) => (
                      <span className="expense-share-chip" key={split.userId}>
                        {split.name} · {formatMoney(split.share, expense.baseCurrency)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="card-actions">
                  <Link href={`/expenses/${expense.id}/edit`}>Edit</Link>
                  {expense.hasReceipt ? (
                    <ReceiptViewerButton expenseId={expense.id} />
                  ) : null}
                  <DeleteExpenseButton id={expense.id} />
                </div>
              </article>
            );
          })
        ) : (
          <article className="empty-card">
            <h2>No expenses yet</h2>
            <p>Add your first cash, card or e-wallet expense.</p>
          </article>
        )}
      </section>
    </div>
  );
}
