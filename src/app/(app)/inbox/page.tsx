import { desc, inArray } from "drizzle-orm";
import { TripInboxClient } from "@/components/TripInboxClient";
import { db } from "@/db";
import { tripInboxItems } from "@/db/schema";
import { listAccessibleCountries } from "@/lib/access";
import { requirePageSession } from "@/lib/session";

export default async function TripInboxPage() {
  const session = await requirePageSession();
  const countries = await listAccessibleCountries(session.user);
  const ids = countries.map((country) => country.id);
  const items = ids.length
    ? await db
        .select({
          id: tripInboxItems.id,
          countryId: tripInboxItems.countryId,
          sourceType: tripInboxItems.sourceType,
          sourceName: tripInboxItems.sourceName,
          kind: tripInboxItems.kind,
          title: tripInboxItems.title,
          provider: tripInboxItems.provider,
          confirmationNo: tripInboxItems.confirmationNo,
          bookingDate: tripInboxItems.bookingDate,
          bookingTime: tripInboxItems.bookingTime,
          status: tripInboxItems.status,
          linkedTravelItemId: tripInboxItems.linkedTravelItemId,
          createdAt: tripInboxItems.createdAt,
        })
        .from(tripInboxItems)
        .where(inArray(tripInboxItems.countryId, ids))
        .orderBy(desc(tripInboxItems.createdAt))
        .limit(100)
    : [];
  const options = countries.map((country) => ({ id: country.id, tripId: country.tripId, tripName: country.tripName, name: country.name, currencyCode: country.currencyCode }));
  return <div className="stack gap-lg"><div className="page-heading"><div><p className="eyebrow">RESERVATIONS</p><h1>Trip Inbox</h1><p className="muted">Turn booking confirmations into travel-ready cards without hunting through your email during the trip.</p></div></div><TripInboxClient countries={options} initialItems={items} /></div>;
}
