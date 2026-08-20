import { FullPageLink as Link } from "@/components/FullPageLink";
import { LiveExpensesWorkspace } from "@/components/LiveExpensesWorkspace";
import { loadExpenseLiveData } from "@/lib/expense-live";
import { requirePageSession } from "@/lib/session";

export default async function ExpensesPage() {
  const session =
    await requirePageSession();
  const initialData =
    await loadExpenseLiveData(
      session.user,
    );

  return (
    <div className="stack gap-lg">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            MONEY
          </p>
          <h1>
            All trip expenses
          </h1>
          <p className="muted">
            See every accessible expense, who paid, and the stored FX amount.
          </p>
        </div>

        <Link
          className="button primary"
          href="/expenses/new"
        >
          + Add
        </Link>
      </div>

      <LiveExpensesWorkspace
        initialData={initialData}
      />
    </div>
  );
}
