import {
  and,
  eq,
} from "drizzle-orm";
import { db } from "@/db";
import { countries } from "@/db/schema";
import { recordActivity } from "@/lib/activity";
import {
  isTrustedMutationRequest,
  mutationRejectedResponse,
} from "@/lib/request-security";
import { getSession } from "@/lib/session";
import {
  canManageTrip,
} from "@/lib/trip-management";
import { updateCountrySchema } from "@/lib/validation";
import { closedTripReadOnlyResponse } from "@/lib/financial-close";

type Context = {
  params: Promise<{
    id: string;
    countryId: string;
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

  const {
    id: tripId,
    countryId,
  } = await context.params;

  if (
    !(await canManageTrip(
      session.user,
      tripId,
    ))
  ) {
    return Response.json(
      { error: "Forbidden" },
      { status: 403 },
    );
  }

  const locked = await closedTripReadOnlyResponse(tripId);
  if (locked) return locked;

  try {
    const input =
      updateCountrySchema.parse(
        await request.json(),
      );

    const existing =
      await db
        .select({
          id: countries.id,
          name: countries.name,
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

    if (!existing[0]) {
      return Response.json(
        {
          error:
            "Country not found.",
        },
        { status: 404 },
      );
    }

    await db
      .update(countries)
      .set({
        defaultExchangeRate:
          input.defaultExchangeRate.toFixed(
            10,
          ),
        fxRateDate: null,
        fxRateProvider:
          "Manual override",
      })
      .where(
        eq(
          countries.id,
          countryId,
        ),
      );

    await recordActivity({
      actorUserId:
        session.user.id,
      action: "UPDATED",
      entityType: "COUNTRY",
      entityId: countryId,
      tripId,
      countryId,
      summary:
        `${session.user.name} updated ${existing[0].name} FX.`,
      metadata: {
        defaultExchangeRate:
          input.defaultExchangeRate,
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
            : "Unable to update country FX.",
      },
      { status: 400 },
    );
  }
}
