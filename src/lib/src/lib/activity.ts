import {
  desc,
  eq,
  inArray,
  or,
} from "drizzle-orm";
import { db } from "@/db";
import {
  activityLogs,
  user,
} from "@/db/schema";
import {
  listAccessibleCountries,
  type SessionUser,
} from "@/lib/access";

export type ActivityInput = {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  tripId?: string | null;
  countryId?: string | null;
  summary: string;
  metadata?: Record<string, unknown> | null;
};

export async function recordActivity(
  input: ActivityInput,
): Promise<void> {
  try {
    await db.insert(activityLogs).values({
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      tripId: input.tripId ?? null,
      countryId: input.countryId ?? null,
      summary: input.summary,
      metadata: input.metadata
        ? JSON.stringify(input.metadata)
        : null,
    });
  } catch {
    // Activity history must never roll back an already-saved trip action.
  }
}

export async function listActivityForUser(
  currentUser: SessionUser,
  limit = 100,
  activeTripId = "",
  activeCountryIds: string[] = [],
) {
  const baseSelect = db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      entityType: activityLogs.entityType,
      entityId: activityLogs.entityId,
      tripId: activityLogs.tripId,
      countryId: activityLogs.countryId,
      summary: activityLogs.summary,
      metadata: activityLogs.metadata,
      createdAt: activityLogs.createdAt,
      actorUserId: activityLogs.actorUserId,
      actorName: user.name,
    })
    .from(activityLogs)
    .leftJoin(
      user,
      eq(activityLogs.actorUserId, user.id),
    );

  if (activeTripId) {
    const activeScope =
      activeCountryIds.length
        ? or(
            eq(
              activityLogs.tripId,
              activeTripId,
            ),
            inArray(
              activityLogs.countryId,
              activeCountryIds,
            ),
          )
        : eq(
            activityLogs.tripId,
            activeTripId,
          );

    return baseSelect
      .where(
        activeScope,
      )
      .orderBy(
        desc(
          activityLogs.createdAt,
        ),
      )
      .limit(limit);
  }

  const accessible = await listAccessibleCountries(
    currentUser,
  );
  const countryIds = accessible.map(
    (country) => country.id,
  );
  const tripIds = [
    ...new Set(
      accessible.map((country) => country.tripId),
    ),
  ];

  if (countryIds.length === 0) {
    return baseSelect
      .where(
        eq(
          activityLogs.actorUserId,
          currentUser.id,
        ),
      )
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
  }

  return baseSelect
    .where(
      or(
        eq(
          activityLogs.actorUserId,
          currentUser.id,
        ),
        inArray(
          activityLogs.countryId,
          countryIds,
        ),
        ...(tripIds.length
          ? [
              inArray(
                activityLogs.tripId,
                tripIds,
              ),
            ]
          : []),
      ),
    )
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit);
}
