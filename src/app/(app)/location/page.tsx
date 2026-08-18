import { LocationTracker } from "@/components/LocationTracker";
import { listAccessibleCountries } from "@/lib/access";
import { requirePageSession } from "@/lib/session";

export default async function LocationPage() {
  const session = await requirePageSession();
  const countries = await listAccessibleCountries(session.user);

  return (
    <div className="stack gap-lg">
      <div className="page-heading">
        <div>
          <p className="eyebrow">LIVE GPS</p>
          <h1>Find your travel crew</h1>
          <p className="muted">
            Share your live position with people assigned to the same country.
          </p>
        </div>
      </div>

      {countries.length ? (
        <LocationTracker
          countries={countries}
          currentUserId={session.user.id}
        />
      ) : (
        <section className="empty-card">
          <h2>No country assigned</h2>
          <p>You need country access before sharing or viewing GPS.</p>
        </section>
      )}
    </div>
  );
}
