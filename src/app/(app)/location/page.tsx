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
    activeTrip.allCountries.filter(
      (country, index, rows) =>
        rows.findIndex((item) => item.tripId === country.tripId) === index,
    );
  const initialCountryId =
    activeTrip.countries[0]?.id ?? countries[0]?.id ?? "";

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
            Share your live position with people assigned to the selected trip.
          </p>
        </div>
      </div>

      {countries.length ? (
        <LocationTracker
          countries={countries}
          currentUserId={
            session.user.id
          }
          initialCountryId={initialCountryId}
        />
      ) : (
        <section className="empty-card">
          <h2>
            No destination assigned
          </h2>
          <p>
            You need access to at least one trip before sharing or viewing GPS.
          </p>
        </section>
      )}
    </div>
  );
}
