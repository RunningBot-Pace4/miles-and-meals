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
  return <div className="stack gap-lg"><div className="page-heading"><div><p className="eyebrow">OPTIONAL · MULTI-COUNTRY TRAVEL</p><h1>Multi-country Journey</h1><p className="muted">Use this only when one holiday visits several countries. Think of a Journey as a folder for related Trips — each Trip still keeps its own country, currency, expenses and settlement.</p></div></div><section className="panel journey-explainer"><div><strong>Example: Europe Holiday 2027</strong><span>🇫🇷 France Trip → 🇮🇹 Italy Trip → 🇨🇭 Switzerland Trip</span></div><p>You do not need a Journey for a normal one-country holiday. A Journey is only a folder that keeps several related Trips together — it never mixes their money ledgers.</p></section><JourneyManager journeys={journeyRows} trips={options} currentUserId={session.user.id} /></div>;
}
