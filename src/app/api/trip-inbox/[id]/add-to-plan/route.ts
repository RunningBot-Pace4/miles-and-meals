import { eq } from "drizzle-orm";
import { db } from "@/db";
import { travelItems, tripInboxItems } from "@/db/schema";
import { canAccessCountry } from "@/lib/access";
import { isTrustedMutationRequest, mutationRejectedResponse } from "@/lib/request-security";
import { getSession } from "@/lib/session";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isTrustedMutationRequest(request)) return mutationRejectedResponse();
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const item = (await db.select().from(tripInboxItems).where(eq(tripInboxItems.id, id)).limit(1))[0];
  if (!item) return Response.json({ error: "Inbox item not found." }, { status: 404 });
  if (!(await canAccessCountry(session.user, item.countryId))) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (item.linkedTravelItemId) return Response.json({ ok: true, travelItemId: item.linkedTravelItemId, idempotent: true });

  // Use the Inbox UUID as the Planner UUID. This gives Add to Plan a stable
  // idempotency key: a double tap, browser retry or interrupted first request
  // can never create a second Planner booking for the same Inbox item.
  const rows = await db
    .insert(travelItems)
    .values({
      id: item.id,
      countryId: item.countryId,
      itemType: "BOOKING",
      title: item.title,
      itemDate: item.bookingDate,
      itemTime: item.bookingTime,
      subtype: item.kind,
      status: "BOOKED",
      provider: item.provider,
      confirmationNo: item.confirmationNo,
      notes: "Imported from Trip Inbox",
      createdBy: session.user.id,
    })
    .onConflictDoNothing()
    .returning({ id: travelItems.id });

  let travelItemId = rows[0]?.id ?? null;

  if (!travelItemId) {
    const existingPlanItem = (
      await db
        .select({
          id: travelItems.id,
          countryId: travelItems.countryId,
          itemType: travelItems.itemType,
        })
        .from(travelItems)
        .where(eq(travelItems.id, item.id))
        .limit(1)
    )[0];

    if (
      !existingPlanItem ||
      existingPlanItem.countryId !== item.countryId ||
      existingPlanItem.itemType !== "BOOKING"
    ) {
      return Response.json(
        { error: "Unable to safely link this booking to Plan." },
        { status: 409 },
      );
    }

    travelItemId = existingPlanItem.id;
  }

  await db
    .update(tripInboxItems)
    .set({
      status: "ADDED",
      linkedTravelItemId: travelItemId,
      updatedAt: new Date(),
    })
    .where(eq(tripInboxItems.id, id));

  return Response.json({ ok: true, travelItemId, idempotent: rows.length === 0 });
}
