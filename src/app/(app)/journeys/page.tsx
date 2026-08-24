import { eq, inArray } from "drizzle-orm";
import { JourneyManager } from "@/components/JourneyManager";
import { db } from "@/db";
import { countries, trips } from "@/db/schema";
import { listJourneysForUser } from "@/lib/journeys";
import { listManagedTrips } from "@/lib/trip-management";
import { requirePageSession } from "@/lib/session";

export default async function JourneysPage() {
  const session = await requirePageSession();
  const [journeyRows, managed] = await Promise.all([listJourneysForUser(session.user.id), listManagedTrips(session.user)]);
  const managedIds = managed.map((trip) => trip.id);
  const tripRows = managedIds.length
    ? await db
        .select({ id: trips.id, name: trips.name, journeyId: trips.journeyId, destination: countries.name })
        .from(trips)
        .leftJoin(countries, eq(countries.tripId, trips.id))
        .where(inArray(trips.id, managedIds))
    : [];
  const options = tripRows.map((trip) => ({ ...trip, destination: trip.destination ?? "Destination" }));
  return <div className="stack gap-lg"><div className="page-heading"><div><p className="eyebrow">MULTI-COUNTRY TRAVEL</p><h1>Journeys</h1><p className="muted">Keep each Trip single-country, then group related Trips into one bigger Journey.</p></div></div><JourneyManager journeys={journeyRows} trips={options} currentUserId={session.user.id} /></div>;
}
