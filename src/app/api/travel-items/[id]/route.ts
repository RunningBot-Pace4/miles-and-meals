import { eq } from "drizzle-orm";
import { db } from "@/db";
import { travelItems } from "@/db/schema";
import { canAccessCountry, getCountryWithTrip } from "@/lib/access";
import { recordActivity } from "@/lib/activity";
import { sendPushToCountry } from "@/lib/push";
import { isTrustedMutationRequest, mutationRejectedResponse } from "@/lib/request-security";
import { getSession } from "@/lib/session";
import { travelItemSchema } from "@/lib/validation";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ id: string }>;
};

async function getExistingItem(id: string) {
  const rows = await db
    .select({
      id: travelItems.id,
      countryId: travelItems.countryId,
    })
    .from(travelItems)
    .where(eq(travelItems.id, id))
    .limit(1);

  return rows[0] ?? null;
}

export async function PATCH(request: Request, context: Context) {
  if (!isTrustedMutationRequest(request)) {
    return mutationRejectedResponse();
  }

  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const existing = await getExistingItem(id);

    if (!existing) {
      return Response.json({ error: "Not found." }, { status: 404 });
    }

    if (!(await canAccessCountry(session.user, existing.countryId))) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const input = travelItemSchema.parse(await request.json());

    if (!(await canAccessCountry(session.user, input.countryId))) {
      return Response.json(
        { error: "You do not have access to the selected country." },
        { status: 403 },
      );
    }

    await db
      .update(travelItems)
      .set({
        countryId: input.countryId,
        itemType: input.itemType,
        title: input.title,
        itemDate: input.itemDate || null,
        itemTime: input.itemTime || null,
        area: input.area || null,
        subtype: input.subtype || null,
        priority: input.priority || null,
        status: input.status || null,
        ownerUserId: input.ownerUserId || null,
        estimatedCost:
          input.estimatedCost === "" ||
          input.estimatedCost === null ||
          input.estimatedCost === undefined
            ? null
            : Number(input.estimatedCost).toFixed(2),
        quantity:
          input.quantity === "" ||
          input.quantity === null ||
          input.quantity === undefined
            ? null
            : Number(input.quantity).toFixed(2),
        provider: input.provider || null,
        confirmationNo: input.confirmationNo || null,
        linkUrl: input.linkUrl || null,
        notes: input.notes || null,
        updatedAt: new Date(),
      })
      .where(eq(travelItems.id, id));

    const country = await getCountryWithTrip(input.countryId);

    await recordActivity({
      actorUserId: session.user.id,
      action: "UPDATED",
      entityType: "PLANNER",
      entityId: id,
      tripId: country?.tripId ?? null,
      countryId: input.countryId,
      summary: `${session.user.name} updated planner item: ${input.title}`,
      metadata: {
        itemType: input.itemType,
      },
    });

    await sendPushToCountry(
      input.countryId,
      session.user.id,
      "PLANNER",
      {
        title: "Trip plan changed",
        body: `${session.user.name} updated ${input.title}.`,
        url: "/planner",
        tag: `planner-${id}`,
      },
    );

    return Response.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update item.";

    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: Context) {
  if (!isTrustedMutationRequest(request)) {
    return mutationRejectedResponse();
  }

  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await getExistingItem(id);

  if (!existing) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  if (!(await canAccessCountry(session.user, existing.countryId))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const country = await getCountryWithTrip(existing.countryId);

  await db.delete(travelItems).where(eq(travelItems.id, id));

  await recordActivity({
    actorUserId: session.user.id,
    action: "DELETED",
    entityType: "PLANNER",
    entityId: id,
    tripId: country?.tripId ?? null,
    countryId: existing.countryId,
    summary: `${session.user.name} deleted a planner item.`,
  });

  await sendPushToCountry(
    existing.countryId,
    session.user.id,
    "PLANNER",
    {
      title: "Trip plan changed",
      body: `${session.user.name} removed a planner item.`,
      url: "/planner",
      tag: `planner-${id}`,
    },
  );

  return Response.json({ ok: true });
}
