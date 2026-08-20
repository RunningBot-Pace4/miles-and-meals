import { listAccessibleCountries } from "@/lib/access";
import { buildExpenseSummary } from "@/lib/dashboard";
import { toNumber } from "@/lib/money";
import { recordApiMetric } from "@/lib/performance";
import { getSession } from "@/lib/session";

export async function GET(
  request: Request,
) {
  const started = Date.now();
  const session = await getSession();

  if (!session) {
    await recordApiMetric({
      userId: null,
      route: "/api/dashboard/finance",
      method: "GET",
      durationMs:
        Date.now() - started,
      statusCode: 401,
    });

    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const countries =
    await listAccessibleCountries(
      session.user,
    );
  const url = new URL(request.url);
  const requested =
    url.searchParams.get("country") ??
    "";

  if (
    requested &&
    !countries.some(
      (country) =>
        country.id === requested,
    )
  ) {
    await recordApiMetric({
      userId: session.user.id,
      route: "/api/dashboard/finance",
      method: "GET",
      durationMs:
        Date.now() - started,
      statusCode: 403,
    });

    return Response.json(
      { error: "Forbidden" },
      { status: 403 },
    );
  }

  const selected = requested
    ? countries.filter(
        (country) =>
          country.id === requested,
      )
    : countries;

  const summary =
    await buildExpenseSummary(
      selected.map(
        (country) =>
          country.id,
      ),
    );
  const baseCurrency =
    selected[0]?.baseCurrency ??
    "MYR";
  const budget = requested
    ? toNumber(
        selected[0]?.budget,
      )
    : [
        ...new Map<
          string,
          number
        >(
          selected.map(
            (country) => [
              country.tripId,
              toNumber(
                country.budget,
              ),
            ],
          ),
        ).values(),
      ].reduce(
        (sum, value) =>
          sum + value,
        0,
      );

  await recordApiMetric({
    userId: session.user.id,
    route: "/api/dashboard/finance",
    method: "GET",
    durationMs:
      Date.now() - started,
    statusCode: 200,
  });

  return Response.json(
    {
      total: summary.total,
      categories:
        summary.categories,
      budget,
      remaining:
        budget - summary.total,
      baseCurrency,
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}
