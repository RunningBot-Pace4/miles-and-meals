import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { countries, countryMembers } from "@/db/schema";
import {
  ensureTripMember,
  removeTripMemberIfNoCountryAccess,
} from "@/lib/access";
import { recordActivity } from "@/lib/activity";
import { isTrustedMutationRequest, mutationRejectedResponse } from "@/lib/request-security";
import { getSession, isSystemAdmin } from "@/lib/session";
import { assignmentSchema } from "@/lib/validation";
import { closedTripReadOnlyResponse } from "@/lib/financial-close";

export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) {
    return mutationRejectedResponse();
  }

  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSystemAdmin(session.user.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const input = assignmentSchema.parse(await request.json());
    const countryRows = await db
      .select({ tripId: countries.tripId })
      .from(countries)
      .where(eq(countries.id, input.countryId))
      .limit(1);

    if (!countryRows[0]) {
      return Response.json({ error: "Country not found." }, { status: 404 });
    }

    const locked = await closedTripReadOnlyResponse(countryRows[0].tripId);
    if (locked) return locked;

    await ensureTripMember(countryRows[0].tripId, input.userId);

    await db
      .insert(countryMembers)
      .values({
        countryId: input.countryId,
        userId: input.userId,
      })
      .onConflictDoNothing();

    await recordActivity({
      actorUserId: session.user.id,
      action: "ASSIGNED",
      entityType: "USER",
      entityId: input.userId,
      tripId: countryRows[0].tripId,
      countryId: input.countryId,
      summary: `${session.user.name} assigned a traveler to a country.`,
    });

    return Response.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to assign member.";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  if (!isTrustedMutationRequest(request)) {
    return mutationRejectedResponse();
  }

  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSystemAdmin(session.user.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const input = assignmentSchema.parse(await request.json());
    const countryRows = await db
      .select({ tripId: countries.tripId })
      .from(countries)
      .where(eq(countries.id, input.countryId))
      .limit(1);

    if (!countryRows[0]) {
      return Response.json({ error: "Country not found." }, { status: 404 });
    }

    const locked = await closedTripReadOnlyResponse(countryRows[0].tripId);
    if (locked) return locked;

    await db
      .delete(countryMembers)
      .where(
        and(
          eq(countryMembers.countryId, input.countryId),
          eq(countryMembers.userId, input.userId),
        ),
      );

    await removeTripMemberIfNoCountryAccess(
      countryRows[0].tripId,
      input.userId,
    );

    await recordActivity({
      actorUserId: session.user.id,
      action: "UNASSIGNED",
      entityType: "USER",
      entityId: input.userId,
      countryId: input.countryId,
      summary: `${session.user.name} removed a traveler from a country.`,
    });

    return Response.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to remove assignment.";
    return Response.json({ error: message }, { status: 400 });
  }
}
