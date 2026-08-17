import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { countries, countryMembers } from "@/db/schema";
import { ensureTripMember } from "@/lib/access";
import { getSession, isSystemAdmin } from "@/lib/session";
import { assignmentSchema } from "@/lib/validation";

export async function POST(request: Request) {
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

    await ensureTripMember(countryRows[0].tripId, input.userId);

    await db
      .insert(countryMembers)
      .values({
        countryId: input.countryId,
        userId: input.userId,
      })
      .onConflictDoNothing();

    return Response.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to assign member.";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSystemAdmin(session.user.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const input = assignmentSchema.parse(await request.json());
    await db
      .delete(countryMembers)
      .where(
        and(
          eq(countryMembers.countryId, input.countryId),
          eq(countryMembers.userId, input.userId),
        ),
      );

    return Response.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to remove assignment.";
    return Response.json({ error: message }, { status: 400 });
  }
}
