import { FullPageLink as Link } from "@/components/FullPageLink";
import { LiveExpensesWorkspace } from "@/components/LiveExpensesWorkspace";
import {
  getActiveTripContext,
} from "@/lib/active-trip";
import { loadExpenseLiveData } from "@/lib/expense-live";
import { getTripFinancialState } from "@/lib/financial-close";
import { requirePageSession } from "@/lib/session";

export default async function ExpensesPage() {
  const session =
    await requirePageSession();
  const activeTrip =
    await getActiveTripContext(
      session.user,
    );
  const [initialData, financialState] =
    await Promise.all([
      loadExpenseLiveData(
        session.user,
        activeTrip.tripId,
      ),
      getTripFinancialState(activeTrip.tripId),
    ]);
  const expensesLocked = financialState?.status === "CLOSED";

  return (
    <div className="stack gap-lg">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            MONEY
          </p>
          <h1>
            Trip expenses
          </h1>
          <p className="muted">
            See expenses for the active trip, who paid, and the stored FX amount.
          </p>
        </div>

        {expensesLocked ? (
          <Link
            className="button secondary"
            href="/settlements"
          >
            Expenses locked · Settle Up
          </Link>
        ) : (
          <Link
            className="button primary"
            href="/expenses/new"
          >
            + Add
          </Link>
        )}
      </div>

      {expensesLocked ? (
        <section className="financial-lock-strip" role="status">
          <span aria-hidden="true">✓</span>
          <div>
            <strong>Final settlement mode</strong>
            <small>Expense add, edit and delete are locked. Repayments and confirmations continue normally.</small>
          </div>
          <Link href="/settlements">View settlement</Link>
        </section>
      ) : null}

      <LiveExpensesWorkspace
        initialData={initialData}
        locked={expensesLocked}
      />
    </div>
  );
}
