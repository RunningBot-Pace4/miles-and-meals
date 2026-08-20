import { LocationTracker } from "@/components/LocationTracker";
import {
  getActiveTripContext,
} from "@/lib/active-trip";
import { requirePageSession } from "@/lib/session";

export default async function LocationPage() {
  const session =
    await requirePageSession();
  const activeTrip =
    await getActiveTripContext(
      session.user,
    );
  const countries =
    activeTrip.countries;

  return (
    <div className="stack gap-lg">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            LIVE GPS
          </p>
          <h1>
            Find your travel crew
          </h1>
          <p className="muted">
            Share your live position with people assigned to the same destination in the active trip.
          </p>
        </div>
      </div>

      {countries.length ? (
        <LocationTracker
          countries={countries}
          currentUserId={
            session.user.id
          }
        />
      ) : (
        <section className="empty-card">
          <h2>
            No destination assigned
          </h2>
          <p>
            You need destination access in the active trip before sharing or viewing GPS.
          </p>
        </section>
      )}
    </div>
  );
}
