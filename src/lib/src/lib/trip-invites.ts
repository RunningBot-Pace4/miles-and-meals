import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  countries,
  countryMembers,
  tripBudgets,
  tripInvites,
  tripMembers,
  trips,
  user,
} from "@/db/schema";
import { canManageTrip } from "@/lib/trip-management";
import {
  earliestValidTripInviteCreatedAt,
  tripInviteExpiresAt,
} from "@/lib/invite-validity";

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type TripInvitePreview = {
  inviteId: string;
  tripId: string;
  tripName: string;
  destinationName: string;
  countryId: string;
  startDate: string | null;
  endDate: string | null;
  ownerName: string;
  expiresAt: Date;
};

export async function createTripInvite(input: {
  currentUser: { id: string; role?: string | null };
  tripId: string;
}): Promise<{ token: string; expiresAt: Date }> {
  if (!(await canManageTrip(input.currentUser, input.tripId))) {
    throw new Error("You do not have permission to invite travelers to this trip.");
  }

  const country = (
    await db
      .select({ id: countries.id })
      .from(countries)
      .where(eq(countries.tripId, input.tripId))
      .limit(1)
  )[0];

  if (!country) {
    throw new Error("This trip does not have a destination yet.");
  }

  const token = randomBytes(24).toString("base64url");
  const expiresAt = tripInviteExpiresAt();

  await db.insert(tripInvites).values({
    tripId: input.tripId,
    tokenHash: hashInviteToken(token),
    createdBy: input.currentUser.id,
    expiresAt,
  });

  return { token, expiresAt };
}


export async function revokeTripInvites(input: {
  currentUser: { id: string; role?: string | null };
  tripId: string;
}): Promise<void> {
  if (!(await canManageTrip(input.currentUser, input.tripId))) {
    throw new Error("You do not have permission to manage invites for this trip.");
  }

  await db
    .update(tripInvites)
    .set({ revokedAt: new Date() })
    .where(and(eq(tripInvites.tripId, input.tripId), isNull(tripInvites.revokedAt)));
}

export async function getTripInvitePreview(token: string): Promise<TripInvitePreview | null> {
  if (!token || token.length < 20 || token.length > 160) {
    return null;
  }

  const now = new Date();
  const rows = await db
    .select({
      inviteId: tripInvites.id,
      tripId: trips.id,
      tripName: trips.name,
      startDate: trips.startDate,
      endDate: trips.endDate,
      countryId: countries.id,
      destinationName: countries.name,
      ownerName: user.name,
      expiresAt: tripInvites.expiresAt,
      useCount: tripInvites.useCount,
      maxUses: tripInvites.maxUses,
    })
    .from(tripInvites)
    .innerJoin(trips, eq(tripInvites.tripId, trips.id))
    .innerJoin(countries, eq(countries.tripId, trips.id))
    .innerJoin(user, eq(tripInvites.createdBy, user.id))
    .where(
      and(
        eq(tripInvites.tokenHash, hashInviteToken(token)),
        isNull(tripInvites.revokedAt),
        eq(trips.financialStatus, "OPEN"),
        gt(tripInvites.expiresAt, now),
        gt(tripInvites.createdAt, earliestValidTripInviteCreatedAt(now)),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row || row.useCount >= row.maxUses) {
    return null;
  }

  return row;
}

export async function acceptTripInvite(
  token: string,
  currentUserId: string,
): Promise<{ tripId: string; countryId: string; budgetPrompt: boolean; alreadyMember: boolean }> {
  const preview = await getTripInvitePreview(token);
  if (!preview) {
    throw new Error("This invite link is invalid, expired or has been revoked.");
  }

  // Insert membership first using the Trip membership primary key as the
  // concurrency guard. Only the request that actually creates the membership
  // consumes one invite use; simultaneous taps from the same traveler do not.
  const insertedMembership = await db
    .insert(tripMembers)
    .values({ tripId: preview.tripId, userId: currentUserId, role: "MEMBER" })
    .onConflictDoNothing()
    .returning({ userId: tripMembers.userId });

  const newlyJoined = insertedMembership.length > 0;

  if (newlyJoined) {
    const claimed = await db
      .update(tripInvites)
      .set({ useCount: sql`${tripInvites.useCount} + 1` })
      .where(
        and(
          eq(tripInvites.id, preview.inviteId),
          isNull(tripInvites.revokedAt),
          gt(tripInvites.expiresAt, new Date()),
          gt(
            tripInvites.createdAt,
            earliestValidTripInviteCreatedAt(),
          ),
          lt(tripInvites.useCount, tripInvites.maxUses),
        ),
      )
      .returning({ id: tripInvites.id });

    if (!claimed.length) {
      // The link reached its limit (or expired/revoked) between preview and
      // acceptance. Remove only the membership created by this request.
      await db
        .delete(tripMembers)
        .where(
          and(
            eq(tripMembers.tripId, preview.tripId),
            eq(tripMembers.userId, currentUserId),
          ),
        );
      throw new Error("This invite link is invalid, expired or has reached its limit.");
    }
  }

  await db
    .insert(countryMembers)
    .values({ countryId: preview.countryId, userId: currentUserId })
    .onConflictDoNothing();

  const budget = (
    await db
      .select({ userId: tripBudgets.userId })
      .from(tripBudgets)
      .where(
        and(
          eq(tripBudgets.tripId, preview.tripId),
          eq(tripBudgets.userId, currentUserId),
        ),
      )
      .limit(1)
  )[0];

  return {
    tripId: preview.tripId,
    countryId: preview.countryId,
    budgetPrompt: !budget,
    alreadyMember: !newlyJoined,
  };
}
