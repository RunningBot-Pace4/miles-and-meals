import {
  and,
  eq,
  inArray,
} from "drizzle-orm";
import { db } from "@/db";
import {
  countries,
  countryMembers,
  tripMembers,
  trips,
  user,
} from "@/db/schema";
import {
  isSystemAdmin,
} from "@/lib/session";
import {
  isTripOwnerRole,
} from "@/lib/trip-roles";

export type TripManagerUser = {
  id: string;
  name: string;
  email: string;
};

export type ManagedTrip = {
  id: string;
  name: string;
  baseCurrency: string;
  startDate: string | null;
  endDate: string | null;
  createdBy: string;
  countries: Array<{
    id: string;
    name: string;
    code: string;
    currencyCode: string;
    defaultExchangeRate: string;
    fxRateDate: string | null;
    fxRateProvider: string | null;
    memberIds: string[];
  }>;
};

type ManagementUser = {
  id: string;
  role?: string | null;
};


export async function canManageTrip(
  currentUser: ManagementUser,
  tripId: string,
): Promise<boolean> {
  if (
    isSystemAdmin(
      currentUser.role,
    )
  ) {
    return true;
  }

  const tripRows = await db
    .select({
      createdBy:
        trips.createdBy,
    })
    .from(trips)
    .where(
      eq(
        trips.id,
        tripId,
      ),
    )
    .limit(1);

  if (
    tripRows[0]?.createdBy ===
    currentUser.id
  ) {
    return true;
  }

  const membership = await db
    .select({
      role:
        tripMembers.role,
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
          currentUser.id,
        ),
      ),
    )
    .limit(1);

  return Boolean(
    membership[0] &&
      isTripOwnerRole(
        membership[0].role,
      ),
  );
}

export async function listManagedTrips(
  currentUser: ManagementUser,
): Promise<ManagedTrip[]> {
  const membershipRows = await db
    .select({
      tripId:
        tripMembers.tripId,
      role:
        tripMembers.role,
    })
    .from(tripMembers)
    .where(
      eq(
        tripMembers.userId,
        currentUser.id,
      ),
    );

  const ownedMembershipIds =
    new Set(
      membershipRows
        .filter((row) =>
          isTripOwnerRole(
            row.role,
          ),
        )
        .map(
          (row) =>
            row.tripId,
        ),
    );

  const allTripRows = await db
    .select({
      id: trips.id,
      name: trips.name,
      baseCurrency:
        trips.baseCurrency,
      startDate:
        trips.startDate,
      endDate:
        trips.endDate,
      createdBy:
        trips.createdBy,
    })
    .from(trips);

  const manageable =
    allTripRows.filter(
      (trip) =>
        trip.createdBy ===
          currentUser.id ||
        ownedMembershipIds.has(
          trip.id,
        ),
    );

  if (
    manageable.length === 0
  ) {
    return [];
  }

  const tripIds =
    manageable.map(
      (trip) => trip.id,
    );

  const countryRows = await db
    .select({
      id: countries.id,
      tripId:
        countries.tripId,
      name: countries.name,
      code: countries.code,
      currencyCode:
        countries.currencyCode,
      defaultExchangeRate:
        countries.defaultExchangeRate,
      fxRateDate:
        countries.fxRateDate,
      fxRateProvider:
        countries.fxRateProvider,
    })
    .from(countries)
    .where(
      inArray(
        countries.tripId,
        tripIds,
      ),
    );

  const countryIds =
    countryRows.map(
      (country) =>
        country.id,
    );

  const assignmentRows =
    countryIds.length === 0
      ? []
      : await db
          .select({
            countryId:
              countryMembers.countryId,
            userId:
              countryMembers.userId,
          })
          .from(countryMembers)
          .where(
            inArray(
              countryMembers.countryId,
              countryIds,
            ),
          );

  const membersByCountry =
    new Map<
      string,
      string[]
    >();

  for (
    const assignment
    of assignmentRows
  ) {
    const current =
      membersByCountry.get(
        assignment.countryId,
      ) ?? [];

    current.push(
      assignment.userId,
    );
    membersByCountry.set(
      assignment.countryId,
      current,
    );
  }

  return manageable
    .map((trip) => ({
      ...trip,
      countries:
        countryRows
          .filter(
            (country) =>
              country.tripId ===
              trip.id,
          )
          .map((country) => ({
            id: country.id,
            name: country.name,
            code: country.code,
            currencyCode:
              country.currencyCode,
            defaultExchangeRate:
              country.defaultExchangeRate,
            fxRateDate:
              country.fxRateDate,
            fxRateProvider:
              country.fxRateProvider,
            memberIds:
              membersByCountry.get(
                country.id,
              ) ?? [],
          }))
          .sort(
            (left, right) =>
              left.name.localeCompare(
                right.name,
              ),
          ),
    }))
    .sort(
      (left, right) =>
        left.name.localeCompare(
          right.name,
        ),
    );
}

export async function listActiveUsersForTripManagement(): Promise<
  TripManagerUser[]
> {
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      banned: user.banned,
    })
    .from(user)
    .orderBy(user.name);

  return rows
    .filter(
      (row) =>
        !row.banned,
    )
    .map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
    }));
}

export async function listJoinedTrips(
  userId: string,
): Promise<
  Array<{
    id: string;
    name: string;
    baseCurrency: string;
    role: string;
  }>
> {
  const rows = await db
    .select({
      id: trips.id,
      name: trips.name,
      baseCurrency:
        trips.baseCurrency,
      role:
        tripMembers.role,
      createdBy:
        trips.createdBy,
    })
    .from(tripMembers)
    .innerJoin(
      trips,
      eq(
        tripMembers.tripId,
        trips.id,
      ),
    )
    .where(
      eq(
        tripMembers.userId,
        userId,
      ),
    )
    .orderBy(trips.name);

  return rows.map(
    (row) => ({
      id: row.id,
      name: row.name,
      baseCurrency:
        row.baseCurrency,
      role:
        row.createdBy === userId
          ? "OWNER"
          : row.role,
    }),
  );
}
