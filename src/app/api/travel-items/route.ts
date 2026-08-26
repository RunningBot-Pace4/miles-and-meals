import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { travelItems, user } from "@/db/schema";
import {
  getActiveTripContext,
} from "@/lib/active-trip";
import {
  canAccessCountry,
  getCountryWithTrip,
} from "@/lib/access";
import { recordActivity } from "@/lib/activity";
import { recordApiMetric } from "@/lib/performance";
import { sendPushToCountry } from "@/lib/push";
import { isTrustedMutationRequest, mutationRejectedResponse } from "@/lib/request-security";
import { getSession } from "@/lib/session";
import { travelItemSchema } from "@/lib/validation";
import { closedTripReadOnlyResponse } from "@/lib/financial-close";
import { getTripCapabilities } from "@/lib/trip-capabilities";

export const runtime = "nodejs";

function offlineMutationId(request: Request): string | null {
  const value = request.headers.get("x-mnm-offline-mutation-id")?.trim() ?? "";
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

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
      sortOrder: travelItems.sortOrder,
      durationMinutes: travelItems.durationMinutes,
      createdBy: travelItems.createdBy,
      updatedAt: travelItems.updatedAt,
      proposedByName: user.name,
    })
    .from(travelItems)
    .leftJoin(user, eq(travelItems.createdBy, user.id))
    .where(and(inArray(travelItems.countryId, ids), ne(travelItems.itemType, "BOOKING")))
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
    const mutationId = offlineMutationId(request);

    if (!(await canAccessCountry(session.user, input.countryId))) {
      return Response.json(
        { error: "You no longer have access to this Trip.", code: "TRIP_ACCESS_REMOVED" },
        { status: 403 },
      );
    }

    const country = await getCountryWithTrip(input.countryId);
    if (!country) return Response.json({ error: "Trip not found." }, { status: 404 });

    if (mutationId) {
      const prior = await db
        .select({
          id: travelItems.id,
          countryId: travelItems.countryId,
          createdBy: travelItems.createdBy,
        })
        .from(travelItems)
        .where(eq(travelItems.id, mutationId))
        .limit(1);

      if (prior[0]) {
        if (
          prior[0].createdBy === session.user.id &&
          prior[0].countryId === input.countryId
        ) {
          return Response.json({ id: prior[0].id, idempotent: true });
        }

        return Response.json(
          { error: "Offline mutation identifier conflict." },
          { status: 409 },
        );
      }
    }

    const capabilities = await getTripCapabilities(session.user, country.tripId);
    if (!capabilities.canEditPlan) {
      return Response.json({ error: "You have view-only access to this Trip's Plan." }, { status: 403 });
    }

    const locked = await closedTripReadOnlyResponse(country.tripId);
    if (locked) return locked;

    const values = {
      ...(mutationId ? { id: mutationId } : {}),
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
      createdBy: session.user.id,
    };

    let created: Array<{ id: string }>;
    try {
      created = await db
        .insert(travelItems)
        .values(values)
        .returning({ id: travelItems.id });
    } catch (error) {
      // If the server committed an offline create but the response was lost, the
      // retry uses the same UUID. Resolve that as success instead of duplicating.
      if (mutationId) {
        const prior = await db
          .select({
            id: travelItems.id,
            countryId: travelItems.countryId,
            createdBy: travelItems.createdBy,
          })
          .from(travelItems)
          .where(eq(travelItems.id, mutationId))
          .limit(1);

        if (
          prior[0]?.createdBy === session.user.id &&
          prior[0]?.countryId === input.countryId
        ) {
          return Response.json({ id: prior[0].id, idempotent: true });
        }
      }

      throw error;
    }

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
