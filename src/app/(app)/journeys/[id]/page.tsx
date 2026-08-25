import { notFound } from "next/navigation";
import { FullPageLink as Link } from "@/components/FullPageLink";
import { JourneyTripOpenButton } from "@/components/JourneyTripOpenButton";
import { getJourneyForUser } from "@/lib/journeys";
import { requirePageSession } from "@/lib/session";

function displayDate(value: string | null) {
  if (!value) return "Date not set";
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export default async function JourneyOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePageSession();
  const { id } = await params;
  const journey = await getJourneyForUser(id, session.user.id);
  if (!journey) notFound();

  const orderedTrips = [...journey.trips].sort((left, right) =>
    (left.startDate ?? "9999-12-31").localeCompare(right.startDate ?? "9999-12-31"),
  );

  return (
    <div className="stack gap-lg journey-overview">
      <div className="page-heading">
        <div>
          <p className="eyebrow">MULTI-COUNTRY JOURNEY</p>
          <h1>{journey.name}</h1>
          <p className="muted">
            {displayDate(journey.startDate)} → {displayDate(journey.endDate)} · {orderedTrips.length} Trip{orderedTrips.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link className="button secondary" href="/journeys">Manage Journey</Link>
      </div>

      <section className="panel journey-overview-explainer">
        <strong>This is the result of grouping Trips.</strong>
        <p>It gives you one ordered route and a shortcut into each Trip. Each country still keeps its own currency, expense ledger and settlement.</p>
      </section>

      {orderedTrips.length ? (
        <div className="journey-route-list">
          {orderedTrips.map((trip, index) => (
            <article className="panel journey-route-card" key={trip.id}>
              <span className="journey-route-number" aria-hidden="true">{index + 1}</span>
              <div className="journey-route-copy">
                <p className="eyebrow">STOP {index + 1}</p>
                <h2>{trip.destination}</h2>
                <strong>{trip.name}</strong>
                <p className="muted">{displayDate(trip.startDate)} → {displayDate(trip.endDate)}</p>
                <div className="offline-pack-meta">
                  <span>Base {trip.baseCurrency}</span>
                  <span>{trip.financialStatus === "CLOSED" ? "Expenses locked" : "Expenses open"}</span>
                </div>
              </div>
              <JourneyTripOpenButton tripId={trip.id} />
            </article>
          ))}
        </div>
      ) : (
        <section className="panel">
          <h2>No visible Trips yet</h2>
          <p className="muted">Return to Manage Journey, select the related Trips, then save. You only see Trips that you can currently access.</p>
        </section>
      )}
    </div>
  );
}
