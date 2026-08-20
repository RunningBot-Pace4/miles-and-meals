import { eq } from "drizzle-orm";
import { db } from "@/db";
import { countries, trips } from "@/db/schema";
import { recordActivity } from "@/lib/activity";
import { getCountryCatalogItem } from "@/lib/country-catalog";
import { isTrustedMutationRequest, mutationRejectedResponse } from "@/lib/request-security";
import { getDailyFxRate } from "@/lib/fx";
import { getSession, isSystemAdmin } from "@/lib/session";
import { createCountrySchema } from "@/lib/validation";

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

    let exchangeRate = input.defaultExchangeRate;
    let fxRateDate: string | null = null;
    let fxRateProvider = "Manual";

    try {
      const dailyFx = await getDailyFxRate(
        catalogCountry.currencyCode,
        trip.baseCurrency,
      );

      exchangeRate = dailyFx.rate;
      fxRateDate = dailyFx.rateDate;
      fxRateProvider = dailyFx.provider;
    } catch {
      // Keep the submitted manual value when the free FX sources are unavailable.
    }

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
      summary: `${session.user.name} added ${catalogCountry.name}.`,
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
        : "Unable to create country.";

    return Response.json({ error: message }, { status: 400 });
  }
}
