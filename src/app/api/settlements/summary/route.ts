import { listAccessibleCountries } from "@/lib/access";
import { buildExpenseSummary } from "@/lib/dashboard";
import { recordApiMetric } from "@/lib/performance";
import { getSession } from "@/lib/session";
import { serializeSettlementLiveData } from "@/lib/settlement-live";

export async function GET(
  request: Request,
) {
  const started = Date.now();
  const session =
    await getSession();

  if (!session) {
    await recordApiMetric({
      userId: null,
      route:
        "/api/settlements/summary",
      method: "GET",
      durationMs:
        Date.now() - started,
      statusCode: 401,
    });

    return Response.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: {
          "cache-control":
            "no-store",
        },
      },
    );
  }

  const countries =
    await listAccessibleCountries(
      session.user,
    );
  const url = new URL(
    request.url,
  );
  const requestedCountryId =
    url.searchParams.get(
      "country",
    ) ?? "";
  const requestedTripId =
    url.searchParams.get(
      "trip",
    ) ?? "";

  if (
    requestedCountryId &&
    !countries.some(
      (country) =>
        country.id ===
        requestedCountryId,
    )
  ) {
    await recordApiMetric({
      userId:
        session.user.id,
      route:
        "/api/settlements/summary",
      method: "GET",
      durationMs:
        Date.now() - started,
      statusCode: 403,
    });

    return Response.json(
      {
        error:
          "Country not accessible.",
      },
      {
        status: 403,
        headers: {
          "cache-control":
            "no-store",
        },
      },
    );
  }

  if (
    requestedTripId &&
    !countries.some(
      (country) =>
        country.tripId ===
        requestedTripId,
    )
  ) {
    await recordApiMetric({
      userId:
        session.user.id,
      route:
        "/api/settlements/summary",
      method: "GET",
      durationMs:
        Date.now() - started,
      statusCode: 403,
    });

    return Response.json(
      {
        error:
          "Trip not accessible.",
      },
      {
        status: 403,
        headers: {
          "cache-control":
            "no-store",
        },
      },
    );
  }

  const selectedCountries =
    requestedCountryId
      ? countries.filter(
          (country) =>
            country.id ===
            requestedCountryId,
        )
      : requestedTripId
        ? countries.filter(
            (country) =>
              country.tripId ===
              requestedTripId,
          )
        : countries;

  const summary =
    await buildExpenseSummary(
      selectedCountries.map(
        (country) =>
          country.id,
      ),
    );
  const baseCurrency =
    selectedCountries[0]
      ?.baseCurrency ??
    "MYR";
  const data =
    serializeSettlementLiveData(
      summary,
      baseCurrency,
    );

  await recordApiMetric({
    userId:
      session.user.id,
    route:
      "/api/settlements/summary",
    method: "GET",
    durationMs:
      Date.now() - started,
    statusCode: 200,
  });

  return Response.json(
    data,
    {
      headers: {
        "cache-control":
          "no-store",
      },
    },
  );
}
