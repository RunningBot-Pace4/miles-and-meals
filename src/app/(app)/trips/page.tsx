import { TripManager } from "@/components/TripManager";
import {
  countryCatalog,
} from "@/lib/country-catalog";
import {
  isSystemAdmin,
  requirePageSession,
} from "@/lib/session";
import {
  listActiveUsersForTripManagement,
  listJoinedTrips,
  listManagedTrips,
} from "@/lib/trip-management";

export default async function TripsPage() {
  const session = await requirePageSession();

  const [managedTrips, joinedTrips] = await Promise.all([
    listManagedTrips(session.user),
    listJoinedTrips(session.user.id),
  ]);

  // Only Trip Owners need the assignment directory. Regular travelers should
  // not receive a global user directory in the page payload.
  const users = managedTrips.length
    ? await listActiveUsersForTripManagement(
        isSystemAdmin(session.user.role),
      )
    : [];

  return (
    <div className="stack gap-lg">
      <div className="page-heading">
        <div>
          <p className="eyebrow">MY TRIPS</p>
          <h1>Create &amp; manage trips</h1>
          <p className="muted">
            Create a trip without a System Admin. The creator becomes
            Trip Owner, selects one destination country during creation,
            and can assign travelers to that trip. Trip Owners and travelers
            use names only; email addresses are reserved for System Admin.
          </p>
        </div>
      </div>

      <TripManager
        managedTrips={managedTrips}
        joinedTrips={joinedTrips}
        users={users}
        countryCatalog={countryCatalog}
        currentUserId={session.user.id}
      />
    </div>
  );
}
