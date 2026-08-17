import { db } from "@/db";
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
