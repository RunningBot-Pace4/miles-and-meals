import { eq } from "drizzle-orm";
import { updateJourneySchema } from "@/lib/journey-validation";
import { db } from "@/db";
import { journeys } from "@/db/schema";
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
    await db.update(journeys).set({
      name: input.name,
      startDate: input.startDate || null,
      endDate: input.endDate || null,
      updatedAt: new Date(),
    }).where(eq(journeys.id, id));
    await updateJourneyTrips({ currentUser: session.user, journeyId: id, tripIds: input.tripIds });
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
  await db.delete(journeys).where(eq(journeys.id, id));
  return Response.json({ ok: true });
}
