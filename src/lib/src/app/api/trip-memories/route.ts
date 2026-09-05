import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { tripMemories, user } from "@/db/schema";
import { closedTripReadOnlyResponse } from "@/lib/financial-close";
import { isTrustedMutationRequest, mutationRejectedResponse } from "@/lib/request-security";
import { getSession } from "@/lib/session";
import { getTripCapabilities } from "@/lib/trip-capabilities";
import { tripMemorySchema, uuidSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const tripId = new URL(request.url).searchParams.get("tripId") ?? "";
  if (!uuidSchema.safeParse(tripId).success || !(await getTripCapabilities(session.user, tripId)).canAccess) return Response.json({ error: "Trip not found." }, { status: 404 });
  const memories = await db.select({
    id: tripMemories.id,
    title: tripMemories.title,
    story: tripMemories.story,
    place: tripMemories.place,
    occurredOn: tripMemories.occurredOn,
    photoData: tripMemories.photoData,
    createdBy: tripMemories.createdBy,
    createdByName: user.name,
    createdAt: tripMemories.createdAt,
  }).from(tripMemories).innerJoin(user, eq(tripMemories.createdBy, user.id)).where(eq(tripMemories.tripId, tripId)).orderBy(desc(tripMemories.occurredOn), desc(tripMemories.createdAt));
  return Response.json({ memories, currentUserId: session.user.id }, { headers: { "cache-control": "private, no-store" } });
}

export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) return mutationRejectedResponse();
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const input = tripMemorySchema.parse(await request.json());
    const capabilities = await getTripCapabilities(session.user, input.tripId);
    if (!capabilities.canAddMemories) return Response.json({ error: "You do not have permission to add Trip memories." }, { status: 403 });
    const locked = await closedTripReadOnlyResponse(input.tripId);
    if (locked) return locked;
    const created = await db.insert(tripMemories).values({
      tripId: input.tripId,
      title: input.title,
      story: input.story || null,
      place: input.place || null,
      occurredOn: input.occurredOn || null,
      photoData: input.photoData || null,
      createdBy: session.user.id,
    }).returning({ id: tripMemories.id });
    return Response.json({ id: created[0].id }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to add memory." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  if (!isTrustedMutationRequest(request)) return mutationRejectedResponse();
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await request.json().catch(() => null) as { id?: string; tripId?: string } | null;
  const id = payload?.id ?? "";
  const tripId = payload?.tripId ?? "";
  if (!uuidSchema.safeParse(id).success || !uuidSchema.safeParse(tripId).success) return Response.json({ error: "Invalid memory." }, { status: 400 });
  const capabilities = await getTripCapabilities(session.user, tripId);
  const rows = await db.select({ createdBy: tripMemories.createdBy }).from(tripMemories).where(and(eq(tripMemories.id, id), eq(tripMemories.tripId, tripId))).limit(1);
  if (!rows[0] || (!capabilities.canManage && rows[0].createdBy !== session.user.id)) return Response.json({ error: "Memory not found." }, { status: 404 });
  const locked = await closedTripReadOnlyResponse(tripId);
  if (locked) return locked;
  await db.delete(tripMemories).where(and(eq(tripMemories.id, id), eq(tripMemories.tripId, tripId)));
  return Response.json({ ok: true });
}
