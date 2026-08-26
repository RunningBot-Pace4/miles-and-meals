import { TravelDocumentsWorkspace } from "@/components/TravelDocumentsWorkspace";
import { getActiveTripContext } from "@/lib/active-trip";
import { requirePageSession } from "@/lib/session";

export default async function DocumentsPage() {
  const session = await requirePageSession();
  const active = await getActiveTripContext(session.user);
  return <TravelDocumentsWorkspace initialTripId={active.tripId} trips={active.trips.map((trip) => ({ id: trip.id, name: trip.name, financialStatus: trip.financialStatus }))} />;
}
