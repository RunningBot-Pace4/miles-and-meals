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
  return <div className="stack gap-lg"><div className="page-heading"><div><p className="eyebrow">OPTIONAL ORGANIZER</p><h1>Multi-country Journeys</h1><p className="muted">Use this only when one holiday covers several countries. Each country remains its own Trip with a separate wallet.</p></div></div><JourneyManager journeys={journeyRows} trips={options} currentUserId={session.user.id} /></div>;
}
