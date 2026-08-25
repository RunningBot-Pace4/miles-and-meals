import {
  and,
  eq,
  inArray,
} from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  countries,
  countryMembers,
  trips,
  user,
} from "@/db/schema";
import {
  ensureTripMember,
} from "@/lib/access";
import { recordActivity } from "@/lib/activity";
import {
  isTrustedMutationRequest,
  mutationRejectedResponse,
} from "@/lib/request-security";
import {
  getSession,
  isSystemAdmin,
} from "@/lib/session";

const bulkSchema = z.object({
  userId: z.string().min(1),
  countryIds: z
    .array(z.string().uuid())
    .max(500),
});

export async function POST(
  request: Request,
) {
  if (!isTrustedMutationRequest(request)) {
    return mutationRejectedResponse();
  }

  const current =
    await getSession();

  if (!current) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  if (
    !isSystemAdmin(
      current.user.role,
    )
  ) {
    return Response.json(
      { error: "Forbidden" },
      { status: 403 },
    );
  }

  try {
    const input = bulkSchema.parse(
      await request.json(),
    );
    const uniqueCountryIds = [
      ...new Set(
        input.countryIds,
      ),
    ];

    const targetRows = await db
      .select({
        id: user.id,
        name: user.name,
      })
      .from(user)
      .where(
        eq(
          user.id,
          input.userId,
        ),
      )
      .limit(1);

    const target =
      targetRows[0];

    if (!target) {
      return Response.json(
        { error: "User not found." },
        { status: 404 },
      );
    }

    const [countryRows, allCountryRows, existingAssignments] = await Promise.all([
      uniqueCountryIds.length === 0
        ? Promise.resolve([])
        : db
            .select({
              id: countries.id,
              tripId: countries.tripId,
              financialStatus: trips.financialStatus,
            })
            .from(countries)
            .innerJoin(trips, eq(countries.tripId, trips.id))
            .where(inArray(countries.id, uniqueCountryIds)),
      db
        .select({ id: countries.id, financialStatus: trips.financialStatus })
        .from(countries)
        .innerJoin(trips, eq(countries.tripId, trips.id)),
      db
        .select({ countryId: countryMembers.countryId })
        .from(countryMembers)
        .where(eq(countryMembers.userId, input.userId)),
    ]);

    if (
      countryRows.length !==
      uniqueCountryIds.length
    ) {
      return Response.json(
        {
          error:
            "One or more countries no longer exist.",
        },
        { status: 400 },
      );
    }

    const selectedIds = new Set(uniqueCountryIds);
    const existingIds = new Set(existingAssignments.map((row) => row.countryId));
    const closedCountryIds = allCountryRows
      .filter((country) => country.financialStatus === "CLOSED")
      .map((country) => country.id);
    const changesClosedTrip = closedCountryIds.some(
      (countryId) => selectedIds.has(countryId) !== existingIds.has(countryId),
    );

    if (changesClosedTrip) {
      return Response.json(
        {
          error: "Closed Trips are read-only. Reopen the affected Trip before changing its traveler access.",
          code: "TRIP_CLOSED_READ_ONLY",
        },
        { status: 423 },
      );
    }

    const openCountryIds = allCountryRows
      .filter((country) => country.financialStatus !== "CLOSED")
      .map((country) => country.id);
    const selectedOpenCountryIds = countryRows
      .filter((country) => country.financialStatus !== "CLOSED")
      .map((country) => country.id);

    if (openCountryIds.length) {
      await db
        .delete(countryMembers)
        .where(
          and(
            eq(countryMembers.userId, input.userId),
            inArray(countryMembers.countryId, openCountryIds),
          ),
        );
    }

    if (
      selectedOpenCountryIds.length > 0
    ) {
      await db
        .insert(countryMembers)
        .values(
          selectedOpenCountryIds.map(
            (countryId) => ({
              countryId,
              userId: input.userId,
            }),
          ),
        )
        .onConflictDoNothing();

      const tripIds = [
        ...new Set(
          countryRows
            .filter((country) => country.financialStatus !== "CLOSED")
            .map(
            (country) =>
              country.tripId,
          ),
        ),
      ];

      await Promise.all(
        tripIds.map((tripId) =>
          ensureTripMember(
            tripId,
            input.userId,
          ),
        ),
      );
    }

    await recordActivity({
      actorUserId:
        current.user.id,
      action: "UPDATED_ACCESS",
      entityType: "USER",
      entityId: input.userId,
      summary: `${current.user.name} set ${target.name} country access to ${uniqueCountryIds.length} destination(s).`,
      metadata: {
        countryIds:
          uniqueCountryIds,
      },
    });

    return Response.json({
      ok: true,
      countryIds:
        uniqueCountryIds,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update country access.",
      },
      { status: 400 },
    );
  }
}
