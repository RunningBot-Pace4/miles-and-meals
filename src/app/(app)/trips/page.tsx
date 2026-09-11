import { TripManager } from "@/components/TripManager";
import { repairOwnedTripAccess } from "@/lib/access";
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

  // Self-heal older creator records so the person who created a trip is
  // always both OWNER and an assigned traveler, including System Admins.
  await repairOwnedTripAccess(
    session.user.id,
  );

  const [managedTrips, joinedTrips] = await Promise.all([
    listManagedTrips(session.user),
    listJoinedTrips(session.user.id),
  ]);

  // Every signed-in traveler can create a trip and choose its participants.
  // The non-admin directory returns names only, never email addresses.
  const users = await listActiveUsersForTripManagement(
        isSystemAdmin(session.user.role),
      );

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
