import {
  and,
  eq,
  inArray,
  isNull,
} from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import {
  countries,
  countryMembers,
  tripBudgets,
  trips,
} from "@/db/schema";
import {
  sumPersonalBudgets,
} from "@/lib/budget-math";
import { toNumber } from "@/lib/money";

export type MissingTripBudget = {
  tripId: string;
  tripName: string;
  baseCurrency: string;
  financialStatus: string;
};

export type UserTripBudget = {
  tripId: string;
  tripName: string;
  baseCurrency: string;
  amount: number | null;
  financialStatus: string;
};

export type TripBudgetSummary = {
  myBudget: number;
  combinedBudget: number;
  budgetsSubmitted: number;
  travelerCount: number;
  missingBudgetCount: number;
};

const readMissingTripBudgets = cache(async (
  userId: string,
  tripId = "",
): Promise<MissingTripBudget[]> => {
  try {
    return await db
      .selectDistinct({
        tripId: trips.id,
        tripName: trips.name,
        baseCurrency: trips.baseCurrency,
        financialStatus: trips.financialStatus,
      })
      .from(countryMembers)
      .innerJoin(countries, eq(countryMembers.countryId, countries.id))
      .innerJoin(trips, eq(countries.tripId, trips.id))
      .leftJoin(
        tripBudgets,
        and(
          eq(tripBudgets.tripId, trips.id),
          eq(tripBudgets.userId, userId),
        ),
      )
      .where(
        and(
          eq(countryMembers.userId, userId),
          eq(trips.financialStatus, "OPEN"),
          isNull(tripBudgets.userId),
          tripId ? eq(trips.id, tripId) : undefined,
        ),
      );
  } catch {
    return [];
  }
});

export async function listMissingTripBudgets(
  userId: string,
  tripId = "",
): Promise<MissingTripBudget[]> {
  return readMissingTripBudgets(userId, tripId);
}

export async function listUserTripBudgets(
  userId: string,
): Promise<UserTripBudget[]> {
  const accessibleTrips = await db
    .selectDistinct({
      tripId: trips.id,
      tripName: trips.name,
      baseCurrency:
        trips.baseCurrency,
      financialStatus:
        trips.financialStatus,
    })
    .from(countryMembers)
    .innerJoin(
      countries,
      eq(
        countryMembers.countryId,
        countries.id,
      ),
    )
    .innerJoin(
      trips,
      eq(
        countries.tripId,
        trips.id,
      ),
    )
    .where(
      eq(
        countryMembers.userId,
        userId,
      ),
    );

  if (
    accessibleTrips.length === 0
  ) {
    return [];
  }

  const budgetRows = await db
    .select({
      tripId:
        tripBudgets.tripId,
      amount:
        tripBudgets.amount,
    })
    .from(tripBudgets)
    .where(
      and(
        eq(
          tripBudgets.userId,
          userId,
        ),
        inArray(
          tripBudgets.tripId,
          accessibleTrips.map(
            (trip) =>
              trip.tripId,
          ),
        ),
      ),
    );

  const budgets = new Map<
    string,
    number
  >(
    budgetRows.map(
      (row) => [
        row.tripId,
        toNumber(row.amount),
      ],
    ),
  );

  return accessibleTrips
    .map((trip) => ({
      ...trip,
      amount:
        budgets.get(
          trip.tripId,
        ) ?? null,
    }))
    .sort((left, right) =>
      left.tripName.localeCompare(
        right.tripName,
      ),
    );
}

export async function savePersonalTripBudget(
  userId: string,
  tripId: string,
  amount: number,
): Promise<void> {
  const accessRows = await db
    .select({
      countryId:
        countryMembers.countryId,
    })
    .from(countryMembers)
    .innerJoin(
      countries,
      eq(
        countryMembers.countryId,
        countries.id,
      ),
    )
    .where(
      and(
        eq(
          countryMembers.userId,
          userId,
        ),
        eq(
          countries.tripId,
          tripId,
        ),
      ),
    )
    .limit(1);

  if (!accessRows[0]) {
    throw new Error(
      "You are not assigned to this trip.",
    );
  }

  await db
    .insert(tripBudgets)
    .values({
      tripId,
      userId,
      amount:
        amount.toFixed(2),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        tripBudgets.tripId,
        tripBudgets.userId,
      ],
      set: {
        amount:
          amount.toFixed(2),
        updatedAt: new Date(),
      },
    });
}

export async function loadTripBudgetSummary(
  currentUserId: string,
  tripId: string,
  accessibleCountryIds: string[],
): Promise<TripBudgetSummary> {
  if (
    accessibleCountryIds.length === 0
  ) {
    return {
      myBudget: 0,
      combinedBudget: 0,
      budgetsSubmitted: 0,
      travelerCount: 0,
      missingBudgetCount: 0,
    };
  }

  const memberRows = await db
    .selectDistinct({
      userId:
        countryMembers.userId,
    })
    .from(countryMembers)
    .where(
      inArray(
        countryMembers.countryId,
        accessibleCountryIds,
      ),
    );

  const travelerIds =
    memberRows.map(
      (row) => row.userId,
    );

  if (
    travelerIds.length === 0
  ) {
    return {
      myBudget: 0,
      combinedBudget: 0,
      budgetsSubmitted: 0,
      travelerCount: 0,
      missingBudgetCount: 0,
    };
  }

  const budgetRows = await db
    .select({
      userId:
        tripBudgets.userId,
      amount:
        tripBudgets.amount,
    })
    .from(tripBudgets)
    .where(
      and(
        eq(
          tripBudgets.tripId,
          tripId,
        ),
        inArray(
          tripBudgets.userId,
          travelerIds,
        ),
      ),
    );

  const normalizedBudgets =
    budgetRows.map(
      (row) => ({
        userId: row.userId,
        amount:
          toNumber(row.amount),
      }),
    );
  const combinedBudget =
    sumPersonalBudgets(
      normalizedBudgets,
    );
  const myBudget =
    normalizedBudgets.find(
      (row) =>
        row.userId ===
        currentUserId,
    )?.amount ?? 0;

  return {
    myBudget,
    combinedBudget,
    budgetsSubmitted:
      budgetRows.length,
    travelerCount:
      travelerIds.length,
    missingBudgetCount:
      Math.max(
        0,
        travelerIds.length -
          budgetRows.length,
      ),
  };
}
