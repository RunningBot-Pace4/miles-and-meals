import { db } from "@/db";
import { and, eq, sql } from "drizzle-orm";
import { tripMembers, trips } from "@/db/schema";
import { getSession, isSystemAdmin } from "@/lib/session";
import { createTripSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSystemAdmin(session.user.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const input = createTripSchema.parse(await request.json());
    const normalizedName = input.name.trim().toLocaleLowerCase();

    const existingTrip = await db
      .select({ id: trips.id })
      .from(trips)
      .where(
        and(
          eq(trips.createdBy, session.user.id),
          sql`lower(trim(${trips.name})) = ${normalizedName}`,
        ),
      )
      .limit(1);

    if (existingTrip.length > 0) {
      return Response.json(
        { error: "A trip with this name already exists." },
        { status: 409 },
      );
    }

    const created = await db
      .insert(trips)
      .values({
        name: input.name,
        baseCurrency: input.baseCurrency,
        budget: input.budget.toFixed(2),
        startDate: input.startDate || null,
        endDate: input.endDate || null,
        createdBy: session.user.id,
      })
      .returning({ id: trips.id });

    await db.insert(tripMembers).values({
      tripId: created[0].id,
      userId: session.user.id,
      role: "ADMIN",
    });

    return Response.json({ id: created[0].id }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create trip.";
    return Response.json({ error: message }, { status: 400 });
  }
}
