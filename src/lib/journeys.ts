import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { journeys, trips, tripMembers, countries } from "@/db/schema";
import { canManageTrip } from "@/lib/trip-management";

export type JourneySummary = {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  createdBy: string;
  trips: Array<{
    id: string;
    name: string;
    destination: string;
    countryId: string;
    startDate: string | null;
    endDate: string | null;
    baseCurrency: string;
    financialStatus: string;
  }>;
};

export async function listJourneysForUser(userId: string): Promise<JourneySummary[]> {
  const memberships = await db
    .select({ tripId: tripMembers.tripId })
    .from(tripMembers)
    .where(eq(tripMembers.userId, userId));
  const tripIds = memberships.map((row) => row.tripId);

  const ownedJourneys = await db
    .select()
    .from(journeys)
    .where(eq(journeys.createdBy, userId));

  const accessibleJourneyIds = new Set<string>(ownedJourneys.map((row) => row.id));
  if (tripIds.length) {
    const linked = await db
      .select({ journeyId: trips.journeyId })
      .from(trips)
      .where(inArray(trips.id, tripIds));
    for (const row of linked) if (row.journeyId) accessibleJourneyIds.add(row.journeyId);
  }

  if (!accessibleJourneyIds.size) return [];
  const journeyRows = await db
    .select()
    .from(journeys)
    .where(inArray(journeys.id, [...accessibleJourneyIds]));

  const tripRows = await db
    .select({
      id: trips.id,
      journeyId: trips.journeyId,
      name: trips.name,
      startDate: trips.startDate,
      endDate: trips.endDate,
      baseCurrency: trips.baseCurrency,
      financialStatus: trips.financialStatus,
      countryId: countries.id,
      destination: countries.name,
    })
    .from(trips)
    .leftJoin(countries, eq(countries.tripId, trips.id))
    .where(inArray(trips.journeyId, journeyRows.map((row) => row.id)));

  const accessibleTrips = new Set(tripIds);
  return journeyRows.map((journey) => ({
    id: journey.id,
    name: journey.name,
    startDate: journey.startDate,
    endDate: journey.endDate,
    createdBy: journey.createdBy,
    // Journey ownership never bypasses current Trip membership. If a creator is
    // later removed from a linked Trip, that Trip immediately disappears from
    // their Journey view instead of leaking stale travel metadata.
    trips: tripRows
      .filter((trip) => trip.journeyId === journey.id && accessibleTrips.has(trip.id))
      .map((trip) => ({
        id: trip.id,
        name: trip.name,
        destination: trip.destination ?? "Destination",
        countryId: trip.countryId ?? "",
        startDate: trip.startDate,
        endDate: trip.endDate,
        baseCurrency: trip.baseCurrency,
        financialStatus: trip.financialStatus,
      })),
  }));
}

export async function getJourneyForUser(
  journeyId: string,
  userId: string,
): Promise<JourneySummary | null> {
  const journeysForUser = await listJourneysForUser(userId);
  return journeysForUser.find((journey) => journey.id === journeyId) ?? null;
}

export async function updateJourneyTrips(input: {
  currentUser: { id: string; role?: string | null };
  journeyId: string;
  tripIds: string[];
}) {
  const journey = (
    await db.select().from(journeys).where(eq(journeys.id, input.journeyId)).limit(1)
  )[0];
  if (!journey || journey.createdBy !== input.currentUser.id) {
    throw new Error("Journey not found or you cannot edit it.");
  }

  const current = await db
    .select({ id: trips.id, financialStatus: trips.financialStatus })
    .from(trips)
    .where(eq(trips.journeyId, input.journeyId));
  const currentIds = new Set(current.map((row) => row.id));
  const requestedRows = input.tripIds.length
    ? await db
        .select({ id: trips.id, financialStatus: trips.financialStatus })
        .from(trips)
        .where(inArray(trips.id, input.tripIds))
    : [];
  const requestedById = new Map(requestedRows.map((row) => [row.id, row]));

  for (const tripId of input.tripIds) {
    if (!(await canManageTrip(input.currentUser, tripId))) {
      throw new Error("You can only add trips you manage to a Journey.");
    }
    if (requestedById.get(tripId)?.financialStatus === "CLOSED" && !currentIds.has(tripId)) {
      throw new Error("A closed Trip is read-only and cannot be added to a Journey until it is reopened.");
    }
  }

  const selected = new Set(input.tripIds);
  for (const row of current) {
    if (
      row.financialStatus !== "CLOSED" &&
      !selected.has(row.id) &&
      (await canManageTrip(input.currentUser, row.id))
    ) {
      await db.update(trips).set({ journeyId: null }).where(eq(trips.id, row.id));
    }
  }
  for (const tripId of input.tripIds) {
    if (requestedById.get(tripId)?.financialStatus !== "CLOSED") {
      await db.update(trips).set({ journeyId: input.journeyId }).where(eq(trips.id, tripId));
    }
  }
}
