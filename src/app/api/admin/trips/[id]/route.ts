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
import { updateTripSchema } from "@/lib/validation";

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
