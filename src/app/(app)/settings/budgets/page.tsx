import { TripBudgetForm } from "@/components/TripBudgetForm";
import { requirePageSession } from "@/lib/session";
import {
  listUserTripBudgets,
} from "@/lib/trip-budget";

export default async function BudgetSettingsPage() {
  const session =
    await requirePageSession();
  const trips =
    await listUserTripBudgets(
      session.user.id,
    );

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
            Your budget belongs to you and the trip. You can change it whenever your travel plan changes.
          </p>
        </div>
      </div>

      {trips.length ? (
        <section className="panel">
          <TripBudgetForm
            trips={trips}
          />
        </section>
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
