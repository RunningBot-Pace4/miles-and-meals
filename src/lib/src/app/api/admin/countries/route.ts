import { eq } from "drizzle-orm";
import { db } from "@/db";
import { countries, trips } from "@/db/schema";
import { recordActivity } from "@/lib/activity";
import { getCountryCatalogItem } from "@/lib/country-catalog";
import { isTrustedMutationRequest, mutationRejectedResponse } from "@/lib/request-security";
import { getSession, isSystemAdmin } from "@/lib/session";
import { createCountrySchema } from "@/lib/validation";
import { closedTripReadOnlyResponse } from "@/lib/financial-close";

export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) {
    return mutationRejectedResponse();
  }

  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSystemAdmin(session.user.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const input = createCountrySchema.parse(await request.json());
    const catalogCountry = getCountryCatalogItem(input.code);

    if (!catalogCountry) {
      return Response.json(
        { error: "Choose a country from the country list." },
        { status: 400 },
      );
    }

    const tripRows = await db
      .select({
        baseCurrency: trips.baseCurrency,
      })
      .from(trips)
      .where(eq(trips.id, input.tripId))
      .limit(1);

    const trip = tripRows[0];

    if (!trip) {
      return Response.json(
        { error: "Trip not found." },
        { status: 404 },
      );
    }

    const locked = await closedTripReadOnlyResponse(input.tripId);
    if (locked) return locked;

    const existingDestination = await db
      .select({ id: countries.id })
      .from(countries)
      .where(eq(countries.tripId, input.tripId))
      .limit(1);

    if (existingDestination[0]) {
      return Response.json(
        {
          error:
            "A trip can only have one destination country. The existing destination is locked.",
        },
        { status: 409 },
      );
    }

    const exchangeRate = input.defaultExchangeRate;
    const fxRateDate =
      input.fxRateProvider === "Manual override"
        ? null
        : input.fxRateDate || null;
    const fxRateProvider = input.fxRateProvider || "Manual";

    const created = await db
      .insert(countries)
      .values({
        tripId: input.tripId,
        name: catalogCountry.name,
        code: catalogCountry.code,
        currencyCode: catalogCountry.currencyCode,
        defaultExchangeRate: exchangeRate.toFixed(10),
        fxRateDate,
        fxRateProvider,
      })
      .returning({ id: countries.id });

    await recordActivity({
      actorUserId: session.user.id,
      action: "CREATED",
      entityType: "COUNTRY",
      entityId: created[0].id,
      tripId: input.tripId,
      countryId: created[0].id,
      summary: `${session.user.name} set ${catalogCountry.name} as the trip destination.`,
    });

    return Response.json(
      {
        id: created[0].id,
        country: {
          name: catalogCountry.name,
          code: catalogCountry.code,
          currencyCode: catalogCountry.currencyCode,
          defaultExchangeRate: exchangeRate,
          fxRateDate,
          fxRateProvider,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to set destination country.";

    return Response.json({ error: message }, { status: 400 });
  }
}
