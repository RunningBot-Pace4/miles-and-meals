import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  countries,
  trips,
} from "@/db/schema";
import { recordActivity } from "@/lib/activity";
import {
  isTrustedMutationRequest,
  mutationRejectedResponse,
} from "@/lib/request-security";
import {
  getSession,
  isSystemAdmin,
} from "@/lib/session";
import { updateCountrySchema } from "@/lib/validation";

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
    const input =
      updateCountrySchema.parse(
        await request.json(),
      );

    const rows = await db
      .select({
        id: countries.id,
        name: countries.name,
        tripId: countries.tripId,
        tripName: trips.name,
      })
      .from(countries)
      .innerJoin(
        trips,
        eq(countries.tripId, trips.id),
      )
      .where(eq(countries.id, id))
      .limit(1);

    const country = rows[0];

    if (!country) {
      return Response.json(
        { error: "Country not found." },
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
      .where(eq(countries.id, id));

    await recordActivity({
      actorUserId: session.user.id,
      action: "UPDATED",
      entityType: "COUNTRY",
      entityId: id,
      tripId: country.tripId,
      countryId: id,
      summary:
        `${session.user.name} updated ${country.tripName} · ${country.name} FX.`,
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
            : "Unable to update country.",
      },
      { status: 400 },
    );
  }
}
