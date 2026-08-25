import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  countryMembers,
  travelItems,
  tripInboxItems,
  user,
} from "@/db/schema";
import { getActiveTripContext } from "@/lib/active-trip";
import type { OfflineTripPack } from "@/lib/offline-pack";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const active = await getActiveTripContext(session.user);
  const requestedTripId = new URL(request.url).searchParams.get("tripId") ?? "";
  const targetTripId = requestedTripId || active.tripId;
  const country = active.allCountries.find((row) => row.tripId === targetTripId);

  if (!country || !targetTripId) {
    return Response.json({ pack: null });
  }

  const countryIds = active.allCountries
    .filter((row) => row.tripId === targetTripId)
    .map((row) => row.id);
  const [memberRows, planRows, reservationRows] = await Promise.all([
    db
      .select({ id: user.id, name: user.name })
      .from(countryMembers)
      .innerJoin(user, eq(countryMembers.userId, user.id))
      .where(inArray(countryMembers.countryId, countryIds))
      .orderBy(asc(user.name)),
    db
      .select()
      .from(travelItems)
      .where(inArray(travelItems.countryId, countryIds))
      .orderBy(asc(travelItems.itemDate), asc(travelItems.itemTime)),
    db
      .select()
      .from(tripInboxItems)
      .where(inArray(tripInboxItems.countryId, countryIds))
      .orderBy(asc(tripInboxItems.bookingDate), asc(tripInboxItems.bookingTime)),
  ]);

  const members = [
    ...new Map(memberRows.map((member) => [member.id, member])).values(),
  ];

  const pack: OfflineTripPack = {
    version: 2,
    savedAt: new Date().toISOString(),
    currentUserId: session.user.id,
    trip: {
      id: country.tripId,
      name: country.tripName,
      destination: country.name,
      countryId: country.id,
      currencyCode: country.currencyCode,
      baseCurrency: country.baseCurrency,
      defaultExchangeRate: Number(country.defaultExchangeRate),
      startDate: country.startDate,
      endDate: country.endDate,
      financialStatus: country.financialStatus,
    },
    members,
    plan: planRows.map((item) => ({
      id: item.id,
      type: item.itemType,
      title: item.title,
      date: item.itemDate,
      time: item.itemTime ?? "",
      area: item.area ?? "",
      status: item.status ?? "",
      provider: item.provider ?? "",
      confirmationNo: item.confirmationNo ?? "",
      notes: item.notes ?? "",
    })),
    reservations: reservationRows.map((item) => ({
      id: item.id,
      kind: item.kind,
      title: item.title,
      provider: item.provider ?? "",
      confirmationNo: item.confirmationNo ?? "",
      date: item.bookingDate,
      time: item.bookingTime ?? "",
      status: item.status,
    })),
  };

  return Response.json({ pack }, { headers: { "cache-control": "no-store" } });
}
