import { eq } from "drizzle-orm";
import { db } from "@/db";
import { travelItems } from "@/db/schema";
import {
  canAccessCountry,
  getCountryWithTrip,
} from "@/lib/access";
import { recordActivity } from "@/lib/activity";
import { sendPushToCountry } from "@/lib/push";
import { isTrustedMutationRequest, mutationRejectedResponse } from "@/lib/request-security";
import { getSession } from "@/lib/session";
import { travelItemUpdateSchema } from "@/lib/validation";
import { closedCountryReadOnlyResponse } from "@/lib/financial-close";
import { getTripCapabilities } from "@/lib/trip-capabilities";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ id: string }>;
};

function offlineMutationId(request: Request): string | null {
  const value = request.headers.get("x-mnm-offline-mutation-id")?.trim() ?? "";
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

async function getExistingItem(id: string) {
  const rows = await db
    .select({
      id: travelItems.id,
      countryId: travelItems.countryId,
      itemType: travelItems.itemType,
      title: travelItems.title,
      itemDate: travelItems.itemDate,
      itemTime: travelItems.itemTime,
      area: travelItems.area,
      subtype: travelItems.subtype,
      priority: travelItems.priority,
      status: travelItems.status,
      ownerUserId: travelItems.ownerUserId,
      estimatedCost: travelItems.estimatedCost,
      quantity: travelItems.quantity,
      provider: travelItems.provider,
      confirmationNo: travelItems.confirmationNo,
      linkUrl: travelItems.linkUrl,
      notes: travelItems.notes,
      sortOrder: travelItems.sortOrder,
      durationMinutes: travelItems.durationMinutes,
      updatedAt: travelItems.updatedAt,
    })
    .from(travelItems)
    .where(eq(travelItems.id, id))
    .limit(1);

  return rows[0] ?? null;
}

function normalizedNumber(value: number | string | null | undefined): string | null {
  if (value === "" || value === null || value === undefined) return null;
  return Number(value).toFixed(2);
}

function plannerPayloadAlreadyApplied(
  existing: NonNullable<Awaited<ReturnType<typeof getExistingItem>>>,
  input: ReturnType<typeof travelItemUpdateSchema.parse>,
): boolean {
  return (
    existing.countryId === input.countryId &&
    existing.itemType === input.itemType &&
    existing.title === input.title &&
    existing.itemDate === (input.itemDate || null) &&
    existing.itemTime === (input.itemTime || null) &&
    existing.area === (input.area || null) &&
    existing.subtype === (input.subtype || null) &&
    existing.priority === (input.priority || null) &&
    existing.status === (input.status || null) &&
    existing.ownerUserId === (input.ownerUserId || null) &&
    normalizedNumber(existing.estimatedCost) === normalizedNumber(input.estimatedCost) &&
    normalizedNumber(existing.quantity) === normalizedNumber(input.quantity) &&
    existing.provider === (input.provider || null) &&
    existing.confirmationNo === (input.confirmationNo || null) &&
    existing.linkUrl === (input.linkUrl || null) &&
    existing.notes === (input.notes || null)
    && existing.sortOrder === input.sortOrder
    && existing.durationMinutes === (input.durationMinutes === "" || input.durationMinutes === null || input.durationMinutes === undefined ? null : input.durationMinutes)
  );
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
      return Response.json(
        { error: "You no longer have access to this Trip.", code: "TRIP_ACCESS_REMOVED" },
        { status: 403 },
      );
    }

    const existingLocked = await closedCountryReadOnlyResponse(existing.countryId);
    if (existingLocked) return existingLocked;

    const existingCountry = await getCountryWithTrip(existing.countryId);
    if (!existingCountry || !(await getTripCapabilities(session.user, existingCountry.tripId)).canEditPlan) {
      return Response.json({ error: "You have view-only access to this Trip's Plan." }, { status: 403 });
    }

    const input = travelItemUpdateSchema.parse(await request.json());
    const mutationId = offlineMutationId(request);

    if (!(await canAccessCountry(session.user, input.countryId))) {
      return Response.json(
        { error: "You do not have access to the selected country." },
        { status: 403 },
      );
    }


    const targetLocked = await closedCountryReadOnlyResponse(input.countryId);
    if (targetLocked) return targetLocked;
    const targetCountry = await getCountryWithTrip(input.countryId);
    if (!targetCountry || !(await getTripCapabilities(session.user, targetCountry.tripId)).canEditPlan) {
      return Response.json({ error: "You have view-only access to the selected Trip's Plan." }, { status: 403 });
    }

    if (input.expectedUpdatedAt) {
      const expected = new Date(input.expectedUpdatedAt).getTime();
      const current = existing.updatedAt.getTime();

      if (!Number.isFinite(expected) || Math.abs(expected - current) > 1) {
        // Offline retries can arrive after the first request was committed but its
        // response was lost. If the desired state is already present, treat the
        // retry as success instead of surfacing a false stale-edit conflict.
        if (mutationId && plannerPayloadAlreadyApplied(existing, input)) {
          return Response.json({ ok: true, idempotent: true });
        }

        return Response.json(
          {
            error:
              "This planner item was changed by another traveler after you opened it. Refresh before saving so newer changes are not overwritten.",
            code: "STALE_EDIT",
            currentUpdatedAt: existing.updatedAt.toISOString(),
          },
          { status: 409 },
        );
      }
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
        sortOrder: input.sortOrder,
        durationMinutes:
          input.durationMinutes === "" || input.durationMinutes === null || input.durationMinutes === undefined
            ? null
            : input.durationMinutes,
        updatedAt: new Date(),
      })
      .where(eq(travelItems.id, id));

    const country = targetCountry;

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
    if (offlineMutationId(request)) {
      return Response.json({ ok: true, idempotent: true });
    }
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  if (!(await canAccessCountry(session.user, existing.countryId))) {
    return Response.json(
      { error: "You no longer have access to this Trip.", code: "TRIP_ACCESS_REMOVED" },
      { status: 403 },
    );
  }

  const locked = await closedCountryReadOnlyResponse(existing.countryId);
  if (locked) return locked;

  const country = await getCountryWithTrip(existing.countryId);
  if (!country || !(await getTripCapabilities(session.user, country.tripId)).canEditPlan) {
    return Response.json({ error: "You have view-only access to this Trip's Plan." }, { status: 403 });
  }

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
