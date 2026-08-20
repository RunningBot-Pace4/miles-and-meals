import { FullPageLink as Link } from "@/components/FullPageLink";
import { LiveExpensesWorkspace } from "@/components/LiveExpensesWorkspace";
import {
  getActiveTripContext,
} from "@/lib/active-trip";
import { loadExpenseLiveData } from "@/lib/expense-live";
import { requirePageSession } from "@/lib/session";

export default async function ExpensesPage() {
  const session =
    await requirePageSession();
  const activeTrip =
    await getActiveTripContext(
      session.user,
    );
  const initialData =
    await loadExpenseLiveData(
      session.user,
      activeTrip.tripId,
    );

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
