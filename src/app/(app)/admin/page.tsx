import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { countries, trips, user } from "@/db/schema";
import { AdminForms } from "@/components/AdminForms";
import { isSystemAdmin, requirePageSession } from "@/lib/session";

export default async function AdminPage() {
  const session = await requirePageSession();

  if (!isSystemAdmin(session.user.role)) {
    redirect("/dashboard");
  }

  const [rawTripRows, countryRows, users] = await Promise.all([
    db.select({ id: trips.id, name: trips.name }).from(trips).orderBy(trips.name),
    db
      .select({
        id: countries.id,
        name: countries.name,
        tripName: trips.name,
      })
      .from(countries)
      .innerJoin(trips, eq(countries.tripId, trips.id))
      .orderBy(trips.name, countries.name),
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
      })
      .from(user)
      .orderBy(user.name),
  ]);

  const seenTripNames = new Set<string>();
  const tripRows = rawTripRows.filter((trip) => {
    const normalizedName = trip.name.trim().toLocaleLowerCase();

    if (seenTripNames.has(normalizedName)) {
      return false;
    }

    seenTripNames.add(normalizedName);
    return true;
  });

  return (
    <div className="stack gap-lg">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ADMIN</p>
          <h1>Trip access & setup</h1>
          <p className="muted">
            A normal member only receives data for countries assigned here.
          </p>
        </div>
      </div>
      <AdminForms trips={tripRows} countries={countryRows} users={users} />
    </div>
  );
}
