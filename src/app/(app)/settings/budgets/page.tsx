import { TripBudgetForm } from "@/components/TripBudgetForm";
import { CategoryBudgetManager } from "@/components/CategoryBudgetManager";
import { requirePageSession } from "@/lib/session";
import {
  listUserTripBudgets,
} from "@/lib/trip-budget";

export default async function BudgetSettingsPage({ searchParams }: { searchParams?: Promise<{ tripId?: string }> } = {}) {
  const query = await searchParams;
  const session =
    await requirePageSession();
  const trips =
    await listUserTripBudgets(
      session.user.id,
    );

  const displayTrips = [...trips].sort((a, b) => Number(b.tripId === query?.tripId) - Number(a.tripId === query?.tripId));

  return (
    <div className="stack gap-lg">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            MY TRAVEL WALLET
          </p>
          <h1>
            Personal budgets
          </h1>
          <p className="muted">
            Your budget belongs to you and the trip. Open Trips can be updated; closed Trips remain visible as read-only history.
          </p>
        </div>
      </div>

      {trips.length ? (
        <>
          <section className="panel">
            <TripBudgetForm
              trips={displayTrips}
            />
          </section>
          <section className="panel">
            <CategoryBudgetManager trips={displayTrips} />
          </section>
        </>
      ) : (
        <section className="empty-card empty-card-feature">
          <div className="empty-icon">
            ◈
          </div>
          <div>
            <h2>
              No trip budget yet
            </h2>
            <p>
              Create a trip or join a trip destination first.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
