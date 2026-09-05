import { and, eq } from "drizzle-orm";
import { updateJourneySchema } from "@/lib/journey-validation";
import { db } from "@/db";
import { journeys, trips } from "@/db/schema";
import { updateJourneyTrips } from "@/lib/journeys";
import { isTrustedMutationRequest, mutationRejectedResponse } from "@/lib/request-security";
import { getSession } from "@/lib/session";


export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isTrustedMutationRequest(request)) return mutationRejectedResponse();
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await context.params;
    const existing = (await db.select({ createdBy: journeys.createdBy }).from(journeys).where(eq(journeys.id, id)).limit(1))[0];
    if (!existing || existing.createdBy !== session.user.id) return Response.json({ error: "Forbidden" }, { status: 403 });
    const input = updateJourneySchema.parse(await request.json());
    await updateJourneyTrips({ currentUser: session.user, journeyId: id, tripIds: input.tripIds });
    await db.update(journeys).set({
      name: input.name,
      startDate: input.startDate || null,
      endDate: input.endDate || null,
      updatedAt: new Date(),
    }).where(eq(journeys.id, id));
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to update Journey." }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isTrustedMutationRequest(request)) return mutationRejectedResponse();
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const existing = (await db.select({ createdBy: journeys.createdBy }).from(journeys).where(eq(journeys.id, id)).limit(1))[0];
  if (!existing || existing.createdBy !== session.user.id) return Response.json({ error: "Forbidden" }, { status: 403 });
  const closedLinked = await db
    .select({ id: trips.id })
    .from(trips)
    .where(and(eq(trips.journeyId, id), eq(trips.financialStatus, "CLOSED")))
    .limit(1);
  if (closedLinked.length) {
    return Response.json(
      { error: "This Journey contains a closed Trip. Reopen that Trip before deleting its Journey grouping.", code: "TRIP_CLOSED_READ_ONLY" },
      { status: 423 },
    );
  }
  await db.delete(journeys).where(eq(journeys.id, id));
  return Response.json({ ok: true });
}
