import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { travelItems, user } from "@/db/schema";
import {
  getActiveTripContext,
  isCountryInActiveTrip,
} from "@/lib/active-trip";
import {
  getCountryWithTrip,
} from "@/lib/access";
import { recordActivity } from "@/lib/activity";
import { recordApiMetric } from "@/lib/performance";
import { sendPushToCountry } from "@/lib/push";
import { isTrustedMutationRequest, mutationRejectedResponse } from "@/lib/request-security";
import { getSession } from "@/lib/session";
import { travelItemSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET() {
  const started = Date.now();
  const session = await getSession();

  if (!session) {
    await recordApiMetric({
      userId: null,
      route: "/api/travel-items",
      method: "GET",
      durationMs: Date.now() - started,
      statusCode: 401,
    });

    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activeTrip =
    await getActiveTripContext(
      session.user,
    );
  const ids =
    activeTrip.countries.map(
      (country) =>
        country.id,
    );

  if (ids.length === 0) {
    await recordApiMetric({
      userId: session.user.id,
      route: "/api/travel-items",
      method: "GET",
      durationMs: Date.now() - started,
      statusCode: 200,
    });

    return Response.json({ items: [] });
  }

  const items = await db
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
      createdBy: travelItems.createdBy,
      updatedAt: travelItems.updatedAt,
      proposedByName: user.name,
    })
    .from(travelItems)
    .leftJoin(user, eq(travelItems.createdBy, user.id))
    .where(inArray(travelItems.countryId, ids))
    .orderBy(desc(travelItems.itemDate), desc(travelItems.createdAt));

  await recordApiMetric({
    userId: session.user.id,
    route: "/api/travel-items",
    method: "GET",
    durationMs: Date.now() - started,
    statusCode: 200,
  });

  return Response.json({ items });
}

export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) {
    return mutationRejectedResponse();
  }

  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const input = travelItemSchema.parse(await request.json());

    if (!(await isCountryInActiveTrip(session.user, input.countryId))) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const created = await db
      .insert(travelItems)
      .values({
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
        createdBy: session.user.id,
      })
      .returning({ id: travelItems.id });

    const country = await getCountryWithTrip(input.countryId);

    await recordActivity({
      actorUserId: session.user.id,
      action: "CREATED",
      entityType: "PLANNER",
      entityId: created[0].id,
      tripId: country?.tripId ?? null,
      countryId: input.countryId,
      summary: `${session.user.name} added planner item: ${input.title}`,
      metadata: {
        itemType: input.itemType,
      },
    });

    await sendPushToCountry(
      input.countryId,
      session.user.id,
      "PLANNER",
      {
        title: "Trip plan updated",
        body: `${session.user.name} added ${input.title}.`,
        url: "/planner",
        tag: `planner-${created[0].id}`,
      },
    );

    return Response.json({ id: created[0].id }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save item.";

    return Response.json({ error: message }, { status: 400 });
  }
}
