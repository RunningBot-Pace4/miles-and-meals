import {
  and,
  eq,
} from "drizzle-orm";
import { db } from "@/db";
import {
  countries,
  countryMembers,
  trips,
  user,
} from "@/db/schema";
import {
  ensureTripMember,
  removeTripMemberIfNoCountryAccess,
} from "@/lib/access";
import { recordActivity } from "@/lib/activity";
import {
  isTrustedMutationRequest,
  mutationRejectedResponse,
} from "@/lib/request-security";
import { getSession } from "@/lib/session";
import {
  canManageTrip,
} from "@/lib/trip-management";
import { tripCountryMemberSchema } from "@/lib/validation";

type Context = {
  params: Promise<{
    id: string;
    countryId: string;
  }>;
};

async function validateContext(
  tripId: string,
  countryId: string,
): Promise<boolean> {
  const rows = await db
    .select({
      id: countries.id,
    })
    .from(countries)
    .where(
      and(
        eq(
          countries.id,
          countryId,
        ),
        eq(
          countries.tripId,
          tripId,
        ),
      ),
    )
    .limit(1);

  return Boolean(rows[0]);
}

export async function POST(
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

  const {
    id: tripId,
    countryId,
  } = await context.params;

  if (
    !(await canManageTrip(
      session.user,
      tripId,
    )) ||
    !(await validateContext(
      tripId,
      countryId,
    ))
  ) {
    return Response.json(
      { error: "Forbidden" },
      { status: 403 },
    );
  }

  try {
    const input =
      tripCountryMemberSchema.parse(
        await request.json(),
      );

    const target =
      await db
        .select({
          id: user.id,
          name: user.name,
          banned: user.banned,
        })
        .from(user)
        .where(
          eq(
            user.id,
            input.userId,
          ),
        )
        .limit(1);

    if (
      !target[0] ||
      target[0].banned
    ) {
      return Response.json(
        {
          error:
            "Traveler is unavailable.",
        },
        { status: 400 },
      );
    }

    await ensureTripMember(
      tripId,
      input.userId,
    );

    await db
      .insert(countryMembers)
      .values({
        countryId,
        userId:
          input.userId,
      })
      .onConflictDoNothing();

    await recordActivity({
      actorUserId:
        session.user.id,
      action: "ASSIGNED",
      entityType: "COUNTRY_MEMBER",
      entityId:
        `${countryId}:${input.userId}`,
      tripId,
      countryId,
      summary:
        `${session.user.name} assigned ${target[0].name} to a trip.`,
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
            : "Unable to assign traveler.",
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

  const session =
    await getSession();

  if (!session) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const {
    id: tripId,
    countryId,
  } = await context.params;

  if (
    !(await canManageTrip(
      session.user,
      tripId,
    )) ||
    !(await validateContext(
      tripId,
      countryId,
    ))
  ) {
    return Response.json(
      { error: "Forbidden" },
      { status: 403 },
    );
  }

  try {
    const input =
      tripCountryMemberSchema.parse(
        await request.json(),
      );

    const tripRows = await db
      .select({
        createdBy: trips.createdBy,
      })
      .from(trips)
      .where(eq(trips.id, tripId))
      .limit(1);

    if (tripRows[0]?.createdBy === input.userId) {
      return Response.json(
        {
          error: "The Trip Owner cannot be removed from their own trip.",
        },
        { status: 409 },
      );
    }

    await db
      .delete(countryMembers)
      .where(
        and(
          eq(
            countryMembers.countryId,
            countryId,
          ),
          eq(
            countryMembers.userId,
            input.userId,
          ),
        ),
      );

    await removeTripMemberIfNoCountryAccess(
      tripId,
      input.userId,
    );

    await recordActivity({
      actorUserId:
        session.user.id,
      action: "UNASSIGNED",
      entityType: "COUNTRY_MEMBER",
      entityId:
        `${countryId}:${input.userId}`,
      tripId,
      countryId,
      summary:
        `${session.user.name} removed a traveler from a trip.`,
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
            : "Unable to remove traveler.",
      },
      { status: 400 },
    );
  }
}
