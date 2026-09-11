import { TripMemoriesWorkspace } from "@/components/TripMemoriesWorkspace";
import { getActiveTripContext } from "@/lib/active-trip";
import { requirePageSession } from "@/lib/session";

export default async function MemoriesPage({ searchParams }: { searchParams?: Promise<{ tripId?: string }> } = {}) {
  const query = await searchParams;
  const session = await requirePageSession();
  const active = await getActiveTripContext(session.user, query?.tripId);
  return <TripMemoriesWorkspace initialTripId={active.tripId} trips={active.trips.map((trip) => ({ id: trip.id, name: trip.name, financialStatus: trip.financialStatus }))} />;
}
