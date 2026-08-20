import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  countries,
  countryMembers,
  tripMembers,
  trips,
  user,
} from "@/db/schema";

export type SessionUser = {
  id: string;
  role?: string | null;
};

export async function listAccessibleCountries(currentUser: SessionUser) {
  return db
    .select({
      id: countries.id,
      name: countries.name,
      code: countries.code,
      currencyCode: countries.currencyCode,
      defaultExchangeRate: countries.defaultExchangeRate,
      tripId: trips.id,
      tripName: trips.name,
      baseCurrency: trips.baseCurrency,
      budget: trips.budget,
      startDate: trips.startDate,
      endDate: trips.endDate,
    })
    .from(countryMembers)
    .innerJoin(
      countries,
      eq(countryMembers.countryId, countries.id),
    )
    .innerJoin(
      trips,
      eq(countries.tripId, trips.id),
    )
    .where(
      eq(
        countryMembers.userId,
        currentUser.id,
      ),
    )
    .orderBy(
      trips.name,
      countries.name,
    );
}

export async function canAccessCountry(
  currentUser: SessionUser,
  countryId: string,
): Promise<boolean> {
  const rows = await db
    .select({
      countryId: countryMembers.countryId,
    })
    .from(countryMembers)
    .where(
      and(
        eq(
          countryMembers.countryId,
          countryId,
        ),
        eq(
          countryMembers.userId,
          currentUser.id,
        ),
      ),
    )
    .limit(1);

  return rows.length === 1;
}

export async function getCountryWithTrip(countryId: string) {
  const rows = await db
    .select({
      countryId: countries.id,
      countryName: countries.name,
      currencyCode: countries.currencyCode,
      defaultExchangeRate: countries.defaultExchangeRate,
      tripId: trips.id,
      tripName: trips.name,
      baseCurrency: trips.baseCurrency,
    })
    .from(countries)
    .innerJoin(trips, eq(countries.tripId, trips.id))
    .where(eq(countries.id, countryId))
    .limit(1);

  return rows[0] ?? null;
}

export async function listCountryMembers(
  countryId: string,
  includeUserId?: string,
) {
  const assigned = await db
    .select({
      id: user.id,
      name: user.name,
    })
    .from(countryMembers)
    .innerJoin(user, eq(countryMembers.userId, user.id))
    .where(eq(countryMembers.countryId, countryId))
    .orderBy(user.name);

  if (!includeUserId || assigned.some((member) => member.id === includeUserId)) {
    return assigned;
  }

  const additional = await db
    .select({
      id: user.id,
      name: user.name,
    })
    .from(user)
    .where(eq(user.id, includeUserId))
    .limit(1);

  return [...assigned, ...additional];
}

export async function ensureTripMember(tripId: string, userId: string) {
  await db
    .insert(tripMembers)
    .values({
      tripId,
      userId,
      role: "MEMBER",
    })
    .onConflictDoNothing();
}

export async function listUsersForCountries(countryIds: string[]) {
  if (countryIds.length === 0) {
    return [];
  }

  return db
    .selectDistinct({
      id: user.id,
      name: user.name,
    })
    .from(countryMembers)
    .innerJoin(user, eq(countryMembers.userId, user.id))
    .where(inArray(countryMembers.countryId, countryIds))
    .orderBy(user.name);
}
