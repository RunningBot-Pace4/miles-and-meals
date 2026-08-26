import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  countryMembers,
  travelItems,
  user,
} from "@/db/schema";
import { getActiveTripContext } from "@/lib/active-trip";
import type { OfflineTripPack } from "@/lib/offline-pack";
import { getSession } from "@/lib/session";

async function buildPack(
  active: Awaited<ReturnType<typeof getActiveTripContext>>,
  targetTripId: string,
  currentUserId: string,
): Promise<OfflineTripPack | null> {
  const country = active.allCountries.find((row) => row.tripId === targetTripId);

  if (!country || !targetTripId || country.financialStatus === "CLOSED") {
    return null;
  }

  const countryIds = active.allCountries
    .filter((row) => row.tripId === targetTripId)
    .map((row) => row.id);
  const [memberRows, planRows] = await Promise.all([
    db
      .select({ id: user.id, name: user.name })
      .from(countryMembers)
      .innerJoin(user, eq(countryMembers.userId, user.id))
      .where(inArray(countryMembers.countryId, countryIds))
      .orderBy(asc(user.name)),
    db
      .select()
      .from(travelItems)
      .where(and(inArray(travelItems.countryId, countryIds), ne(travelItems.itemType, "BOOKING")))
      .orderBy(asc(travelItems.itemDate), asc(travelItems.itemTime)),
  ]);

  const members = [
    ...new Map(memberRows.map((member) => [member.id, member])).values(),
  ];

  const pack: OfflineTripPack = {
    version: 2,
    savedAt: new Date().toISOString(),
    currentUserId,
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
  };

  return pack;
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const active = await getActiveTripContext(session.user);
  const parameters = new URL(request.url).searchParams;
  const requestedTripId = parameters.get("tripId") ?? "";

  if (parameters.get("all") === "1") {
    const tripIds = [...new Set(active.allCountries
      .filter((country) => country.financialStatus !== "CLOSED")
      .map((country) => country.tripId))];
    const packs = (await Promise.all(
      tripIds.map((tripId) => buildPack(active, tripId, session.user.id)),
    )).filter((pack): pack is OfflineTripPack => Boolean(pack));

    return Response.json({ packs }, { headers: { "cache-control": "private, no-store" } });
  }

  const targetTripId = requestedTripId || active.tripId;
  const pack = await buildPack(active, targetTripId, session.user.id);

  return Response.json({ pack }, { headers: { "cache-control": "private, no-store" } });
}
