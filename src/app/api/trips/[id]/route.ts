import { eq } from "drizzle-orm";
import { db } from "@/db";
import { trips } from "@/db/schema";
import { recordActivity } from "@/lib/activity";
import {
  isTrustedMutationRequest,
  mutationRejectedResponse,
} from "@/lib/request-security";
import { getSession } from "@/lib/session";
import {
  canManageTrip,
} from "@/lib/trip-management";
import { selfServiceTripUpdateSchema } from "@/lib/validation";

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

  const session =
    await getSession();

  if (!session) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id } =
    await context.params;

  if (
    !(await canManageTrip(
      session.user,
      id,
    ))
  ) {
    return Response.json(
      { error: "Forbidden" },
      { status: 403 },
    );
  }

  try {
    const input =
      selfServiceTripUpdateSchema.parse(
        await request.json(),
      );

    const existing =
      await db
        .select({
          id: trips.id,
        })
        .from(trips)
        .where(
          eq(
            trips.id,
            id,
          ),
        )
        .limit(1);

    if (!existing[0]) {
      return Response.json(
        { error: "Trip not found." },
        { status: 404 },
      );
    }

    await db
      .update(trips)
      .set({
        name: input.name,
        startDate:
          input.startDate ||
          null,
        endDate:
          input.endDate ||
          null,
      })
      .where(
        eq(
          trips.id,
          id,
        ),
      );

    await recordActivity({
      actorUserId:
        session.user.id,
      action: "UPDATED",
      entityType: "TRIP",
      entityId: id,
      tripId: id,
      summary:
        `${session.user.name} updated trip ${input.name}.`,
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
