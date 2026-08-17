import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { countries, expenses, user } from "@/db/schema";
import { DeleteExpenseButton } from "@/components/DeleteExpenseButton";
import { listAccessibleCountries } from "@/lib/access";
import { formatMoney, toNumber } from "@/lib/money";
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
          })
          .from(expenses)
          .innerJoin(countries, eq(expenses.countryId, countries.id))
          .innerJoin(user, eq(expenses.paidByUserId, user.id))
          .where(inArray(expenses.countryId, countryIds))
          .orderBy(desc(expenses.expenseDate), desc(expenses.createdAt));

  return (
    <div className="stack gap-lg">
      <div className="page-heading">
        <div>
          <p className="eyebrow">MONEY</p>
          <h1>Expenses</h1>
          <p className="muted">
            Each record keeps its own FX rate and actual card charge.
          </p>
        </div>
        <Link className="button primary" href="/expenses/new">
          + Add
        </Link>
      </div>

      <section className="card-list">
        {rows.length ? (
          rows.map((expense) => {
            const displayAmount = toNumber(
              expense.actualConvertedAmount ?? expense.convertedAmount,
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
                <div className="card-actions">
                  <Link href={`/expenses/${expense.id}/edit`}>Edit</Link>
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
