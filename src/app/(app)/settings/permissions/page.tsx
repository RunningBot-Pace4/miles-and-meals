import { TripPermissionsManager } from "@/components/TripPermissionsManager";
import { getActiveTripContext } from "@/lib/active-trip";
import { requirePageSession } from "@/lib/session";

export default async function TripPermissionsPage() {
  const session = await requirePageSession();
  const active = await getActiveTripContext(session.user);
  return <TripPermissionsManager
    initialTripId={active.tripId}
    trips={active.trips.map((trip) => ({ id: trip.id, name: trip.name, financialStatus: trip.financialStatus }))}
  />;
}
