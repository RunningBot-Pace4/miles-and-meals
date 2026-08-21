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


export async function ensureTripOwnerAccess(
  tripId: string,
  userId: string,
  countryId: string,
): Promise<void> {
  await db
    .insert(tripMembers)
    .values({
      tripId,
      userId,
      role: "OWNER",
    })
    .onConflictDoUpdate({
      target: [
        tripMembers.tripId,
        tripMembers.userId,
      ],
      set: { role: "OWNER" },
    });

  await db
    .insert(countryMembers)
    .values({
      countryId,
      userId,
    })
    .onConflictDoNothing();

  const [tripAccess, countryAccess] =
    await Promise.all([
      db
        .select({
          userId: tripMembers.userId,
        })
        .from(tripMembers)
        .where(
          and(
            eq(
              tripMembers.tripId,
              tripId,
            ),
            eq(
              tripMembers.userId,
              userId,
            ),
          ),
        )
        .limit(1),
      db
        .select({
          userId: countryMembers.userId,
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
              userId,
            ),
          ),
        )
        .limit(1),
    ]);

  if (!tripAccess[0] || !countryAccess[0]) {
    throw new Error(
      "Trip Owner access could not be assigned.",
    );
  }
}

export async function repairOwnedTripAccess(
  userId: string,
): Promise<void> {
  const owned = await db
    .select({
      tripId: trips.id,
      countryId: countries.id,
    })
    .from(trips)
    .leftJoin(
      countries,
      eq(
        countries.tripId,
        trips.id,
      ),
    )
    .where(
      eq(
        trips.createdBy,
        userId,
      ),
    );

  for (const row of owned) {
    await db
      .insert(tripMembers)
      .values({
        tripId: row.tripId,
        userId,
        role: "OWNER",
      })
      .onConflictDoUpdate({
        target: [
          tripMembers.tripId,
          tripMembers.userId,
        ],
        set: { role: "OWNER" },
      });

    if (!row.countryId) {
      continue;
    }

    await db
      .insert(countryMembers)
      .values({
        countryId: row.countryId,
        userId,
      })
      .onConflictDoNothing();
  }
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

export async function removeTripMemberIfNoCountryAccess(
  tripId: string,
  userId: string,
): Promise<void> {
  const tripRow = await db
    .select({
      createdBy: trips.createdBy,
    })
    .from(trips)
    .where(eq(trips.id, tripId))
    .limit(1);

  // The creator is the permanent Trip Owner and must always retain access.
  if (tripRow[0]?.createdBy === userId) {
    return;
  }

  const remainingCountryAccess = await db
    .select({
      countryId: countryMembers.countryId,
    })
    .from(countryMembers)
    .innerJoin(
      countries,
      eq(countryMembers.countryId, countries.id),
    )
    .where(
      and(
        eq(countries.tripId, tripId),
        eq(countryMembers.userId, userId),
      ),
    )
    .limit(1);

  if (remainingCountryAccess.length > 0) {
    return;
  }

  await db
    .delete(tripMembers)
    .where(
      and(
        eq(tripMembers.tripId, tripId),
        eq(tripMembers.userId, userId),
      ),
    );
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
