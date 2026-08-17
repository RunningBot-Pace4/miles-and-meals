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
          <h1>Find trip members</h1>
          <p className="muted">
            Location is shared only after the person presses Start Sharing.
          </p>
        </div>
      </div>

      {countries.length ? (
        <LocationTracker countries={countries} />
      ) : (
        <section className="empty-card">
          <h2>No country assigned</h2>
          <p>You need country access before sharing or viewing GPS.</p>
        </section>
      )}
    </div>
  );
}
