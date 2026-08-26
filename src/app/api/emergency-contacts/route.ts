import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { tripEmergencyContacts } from "@/db/schema";
import { closedTripReadOnlyResponse } from "@/lib/financial-close";
import { isTrustedMutationRequest, mutationRejectedResponse } from "@/lib/request-security";
import { getSession } from "@/lib/session";
import { getTripCapabilities } from "@/lib/trip-capabilities";
import { emergencyContactSchema, uuidSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const tripId = new URL(request.url).searchParams.get("tripId") ?? "";
  if (!uuidSchema.safeParse(tripId).success || !(await getTripCapabilities(session.user, tripId)).canAccess) return Response.json({ error: "Trip not found." }, { status: 404 });
  const contacts = await db.select().from(tripEmergencyContacts).where(eq(tripEmergencyContacts.tripId, tripId)).orderBy(asc(tripEmergencyContacts.label));
  return Response.json({ contacts }, { headers: { "cache-control": "private, no-store" } });
}

export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) return mutationRejectedResponse();
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const input = emergencyContactSchema.parse(await request.json());
    const capabilities = await getTripCapabilities(session.user, input.tripId);
    if (!capabilities.canEditPlan) return Response.json({ error: "You do not have permission to edit Trip essentials." }, { status: 403 });
    const locked = await closedTripReadOnlyResponse(input.tripId);
    if (locked) return locked;
    const created = await db.insert(tripEmergencyContacts).values({
      tripId: input.tripId,
      label: input.label,
      contactName: input.contactName,
      phone: input.phone,
      notes: input.notes || null,
      createdBy: session.user.id,
    }).returning({ id: tripEmergencyContacts.id });
    return Response.json({ id: created[0].id }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to add emergency contact." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  if (!isTrustedMutationRequest(request)) return mutationRejectedResponse();
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await request.json().catch(() => null) as { id?: string; tripId?: string } | null;
  const id = payload?.id ?? "";
  const tripId = payload?.tripId ?? "";
  const capabilities = await getTripCapabilities(session.user, tripId);
  if (!uuidSchema.safeParse(id).success || !capabilities.canEditPlan) return Response.json({ error: "Contact not found." }, { status: 404 });
  const locked = await closedTripReadOnlyResponse(tripId);
  if (locked) return locked;
  await db.delete(tripEmergencyContacts).where(and(eq(tripEmergencyContacts.id, id), eq(tripEmergencyContacts.tripId, tripId)));
  return Response.json({ ok: true });
}
