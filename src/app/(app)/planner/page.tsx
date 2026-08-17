import { desc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { travelItems } from "@/db/schema";
import { PlannerClient } from "@/components/PlannerClient";
import { listAccessibleCountries } from "@/lib/access";
import { requirePageSession } from "@/lib/session";

export default async function PlannerPage() {
  const session = await requirePageSession();
  const countries = await listAccessibleCountries(session.user);
  const ids = countries.map((country) => country.id);

  const items =
    ids.length === 0
      ? []
      : await db
          .select()
          .from(travelItems)
          .where(inArray(travelItems.countryId, ids))
          .orderBy(desc(travelItems.itemDate), desc(travelItems.createdAt));

  return (
    <div className="stack gap-lg">
      <div className="page-heading planner-page-heading">
        <div>
          <p className="eyebrow">MILES & MEALS</p>
          <h1>Plan the good stuff</h1>
          <p className="muted">
            Itinerary, places, meals, shopping and bookings — built for the phone in your hand.
          </p>
        </div>
      </div>
      <PlannerClient countries={countries} items={items} />
    </div>
  );
}
