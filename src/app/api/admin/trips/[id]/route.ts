import { eq } from "drizzle-orm";
import { db } from "@/db";
import { trips } from "@/db/schema";
import { recordActivity } from "@/lib/activity";
import {
  isTrustedMutationRequest,
  mutationRejectedResponse,
} from "@/lib/request-security";
import {
  getSession,
  isSystemAdmin,
} from "@/lib/session";
import {
  deleteTripSchema,
  updateTripSchema,
} from "@/lib/validation";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  request: Request,
  context: Context,
) {
  if (!isTrustedMutationRequest(request)) {
    return mutationRejectedResponse();
  }

  const session = await getSession();

  if (!session) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  if (!isSystemAdmin(session.user.role)) {
    return Response.json(
      { error: "Forbidden" },
      { status: 403 },
    );
  }

  const { id } = await context.params;

  try {
    const input = updateTripSchema.parse(
      await request.json(),
    );

    const existingRows = await db
      .select({
        id: trips.id,
        baseCurrency: trips.baseCurrency,
      })
      .from(trips)
      .where(eq(trips.id, id))
      .limit(1);

    if (!existingRows[0]) {
      return Response.json(
        { error: "Trip not found." },
        { status: 404 },
      );
    }

    await db
      .update(trips)
      .set({
        name: input.name,
        budget: input.budget.toFixed(2),
        startDate: input.startDate || null,
        endDate: input.endDate || null,
      })
      .where(eq(trips.id, id));

    await recordActivity({
      actorUserId: session.user.id,
      action: "UPDATED",
      entityType: "TRIP",
      entityId: id,
      tripId: id,
      summary:
        `${session.user.name} updated trip ${input.name}.`,
      metadata: {
        baseCurrency:
          existingRows[0].baseCurrency,
        budget: input.budget,
        startDate:
          input.startDate || null,
        endDate:
          input.endDate || null,
      },
    });

    return Response.json({
      ok: true,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update trip.",
      },
      { status: 400 },
    );
  }
}


export async function DELETE(
  request: Request,
  context: Context,
) {
  if (!isTrustedMutationRequest(request)) {
    return mutationRejectedResponse();
  }

  const session = await getSession();

  if (!session) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  if (!isSystemAdmin(session.user.role)) {
    return Response.json(
      { error: "Forbidden" },
      { status: 403 },
    );
  }

  const { id } = await context.params;

  try {
    const input =
      deleteTripSchema.parse(
        await request.json(),
      );

    const existingRows = await db
      .select({
        id: trips.id,
        name: trips.name,
        baseCurrency:
          trips.baseCurrency,
      })
      .from(trips)
      .where(
        eq(
          trips.id,
          id,
        ),
      )
      .limit(1);

    const existing =
      existingRows[0];

    if (!existing) {
      return Response.json(
        { error: "Trip not found." },
        { status: 404 },
      );
    }

    if (
      input.confirmationName !==
      existing.name
    ) {
      return Response.json(
        {
          error:
            "Trip name confirmation does not match exactly.",
        },
        { status: 400 },
      );
    }

    await db
      .delete(trips)
      .where(
        eq(
          trips.id,
          id,
        ),
      );

    await recordActivity({
      actorUserId:
        session.user.id,
      action: "DELETED",
      entityType: "TRIP",
      entityId: id,
      summary:
        `${session.user.name} permanently deleted trip ${existing.name}.`,
      metadata: {
        deletedTripId: id,
        deletedTripName:
          existing.name,
        baseCurrency:
          existing.baseCurrency,
      },
    });

    return Response.json({
      ok: true,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to delete trip.",
      },
      { status: 400 },
    );
  }
}
