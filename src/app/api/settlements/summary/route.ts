import { listAccessibleCountries } from "@/lib/access";
import { buildExpenseSummary } from "@/lib/dashboard";
import {
  getSession,
} from "@/lib/session";
import { serializeSettlementLiveData } from "@/lib/settlement-live";

export async function GET(request: Request) {
  const session = await getSession();

  if (!session) {
    return Response.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  }

  const countries =
    await listAccessibleCountries(
      session.user,
    );
  const url = new URL(request.url);
  const requestedCountryId =
    url.searchParams.get("country") ?? "";

  if (
    requestedCountryId &&
    !countries.some(
      (country) =>
        country.id ===
        requestedCountryId,
    )
  ) {
    return Response.json(
      { error: "Country not accessible." },
      {
        status: 403,
        headers: {
          "cache-control": "no-store",
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
      : countries;

  const summary =
    await buildExpenseSummary(
      selectedCountries.map(
        (country) => country.id,
      ),
    );

  const baseCurrency =
    selectedCountries[0]
      ?.baseCurrency ?? "MYR";

  return Response.json(
    serializeSettlementLiveData(
      summary,
      baseCurrency,
    ),
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}
