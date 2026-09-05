import { and, desc, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { tripDocuments, user } from "@/db/schema";
import { closedTripReadOnlyResponse } from "@/lib/financial-close";
import { isTrustedMutationRequest, mutationRejectedResponse } from "@/lib/request-security";
import { getSession } from "@/lib/session";
import { getTripCapabilities } from "@/lib/trip-capabilities";
import { tripDocumentSchema, uuidSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const tripId = new URL(request.url).searchParams.get("tripId") ?? "";
  if (!uuidSchema.safeParse(tripId).success) return Response.json({ error: "Trip not found." }, { status: 404 });
  const capabilities = await getTripCapabilities(session.user, tripId);
  if (!capabilities.canAccess || !capabilities.canViewDocuments) {
    return Response.json({ error: "You do not have permission to view this Trip's documents." }, { status: 403 });
  }
  const rows = await db.select({
    id: tripDocuments.id,
    title: tripDocuments.title,
    documentType: tripDocuments.documentType,
    documentData: tripDocuments.documentData,
    externalUrl: tripDocuments.externalUrl,
    expiryDate: tripDocuments.expiryDate,
    visibility: tripDocuments.visibility,
    createdBy: tripDocuments.createdBy,
    createdByName: user.name,
    createdAt: tripDocuments.createdAt,
  }).from(tripDocuments)
    .innerJoin(user, eq(tripDocuments.createdBy, user.id))
    .where(and(
      eq(tripDocuments.tripId, tripId),
      or(eq(tripDocuments.visibility, "TRIP"), eq(tripDocuments.createdBy, session.user.id)),
    ))
    .orderBy(desc(tripDocuments.createdAt));
  return Response.json({ documents: rows, canManage: capabilities.canManage, currentUserId: session.user.id }, { headers: { "cache-control": "private, no-store" } });
}

export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) return mutationRejectedResponse();
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const input = tripDocumentSchema.parse(await request.json());
    const capabilities = await getTripCapabilities(session.user, input.tripId);
    if (!capabilities.canAccess || !capabilities.canViewDocuments) {
      return Response.json({ error: "You do not have permission to add Trip documents." }, { status: 403 });
    }
    const locked = await closedTripReadOnlyResponse(input.tripId);
    if (locked) return locked;
    const created = await db.insert(tripDocuments).values({
      tripId: input.tripId,
      title: input.title,
      documentType: input.documentType,
      documentData: input.documentData || null,
      externalUrl: input.externalUrl || null,
      expiryDate: input.expiryDate || null,
      visibility: input.visibility,
      createdBy: session.user.id,
    }).returning({ id: tripDocuments.id });
    return Response.json({ id: created[0].id }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to add document." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  if (!isTrustedMutationRequest(request)) return mutationRejectedResponse();
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await request.json().catch(() => null) as { id?: string; tripId?: string } | null;
  const id = payload?.id ?? "";
  const tripId = payload?.tripId ?? "";
  if (!uuidSchema.safeParse(id).success || !uuidSchema.safeParse(tripId).success) return Response.json({ error: "Invalid document." }, { status: 400 });
  const capabilities = await getTripCapabilities(session.user, tripId);
  const rows = await db.select({ createdBy: tripDocuments.createdBy }).from(tripDocuments).where(and(eq(tripDocuments.id, id), eq(tripDocuments.tripId, tripId))).limit(1);
  if (!rows[0] || (!capabilities.canManage && rows[0].createdBy !== session.user.id)) return Response.json({ error: "Document not found." }, { status: 404 });
  const locked = await closedTripReadOnlyResponse(tripId);
  if (locked) return locked;
  await db.delete(tripDocuments).where(and(eq(tripDocuments.id, id), eq(tripDocuments.tripId, tripId)));
  return Response.json({ ok: true });
}
