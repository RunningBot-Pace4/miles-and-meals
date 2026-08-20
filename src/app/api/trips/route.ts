import {
  and,
  eq,
  sql,
} from "drizzle-orm";
import { db } from "@/db";
import {
  tripMembers,
  trips,
} from "@/db/schema";
import { recordActivity } from "@/lib/activity";
import {
  isTrustedMutationRequest,
  mutationRejectedResponse,
} from "@/lib/request-security";
import { getSession } from "@/lib/session";
import { selfServiceTripSchema } from "@/lib/validation";

export async function POST(
  request: Request,
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

  try {
    const input =
      selfServiceTripSchema.parse(
        await request.json(),
      );
    const normalizedName =
      input.name
        .trim()
        .toLocaleLowerCase();

    const duplicate =
      await db
        .select({
          id: trips.id,
        })
        .from(trips)
        .where(
          and(
            eq(
              trips.createdBy,
              session.user.id,
            ),
            sql`lower(trim(${trips.name})) = ${normalizedName}`,
          ),
        )
        .limit(1);

    if (duplicate[0]) {
      return Response.json(
        {
          error:
            "You already have a trip with this name.",
        },
        { status: 409 },
      );
    }

    const created =
      await db
        .insert(trips)
        .values({
          name: input.name,
          baseCurrency:
            input.baseCurrency,
          budget: "0",
          startDate:
            input.startDate ||
            null,
          endDate:
            input.endDate ||
            null,
          createdBy:
            session.user.id,
        })
        .returning({
          id: trips.id,
        });

    const tripId =
      created[0]?.id;

    if (!tripId) {
      throw new Error(
        "Trip could not be created.",
      );
    }

    await db
      .insert(tripMembers)
      .values({
        tripId,
        userId:
          session.user.id,
        role: "OWNER",
      })
      .onConflictDoUpdate({
        target: [
          tripMembers.tripId,
          tripMembers.userId,
        ],
        set: {
          role: "OWNER",
        },
      });

    await recordActivity({
      actorUserId:
        session.user.id,
      action: "CREATED",
      entityType: "TRIP",
      entityId: tripId,
      tripId,
      summary:
        `${session.user.name} created trip ${input.name}.`,
    });

    return Response.json(
      {
        id: tripId,
      },
      { status: 201 },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create trip.",
      },
      { status: 400 },
    );
  }
}
