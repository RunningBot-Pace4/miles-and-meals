import {
  getActiveTripContext,
} from "@/lib/active-trip";
import { buildExpenseSummary } from "@/lib/dashboard";
import { recordApiMetric } from "@/lib/performance";
import { getSession } from "@/lib/session";
import {
  loadTripBudgetSummary,
} from "@/lib/trip-budget";

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
        "/api/dashboard/finance",
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

  const activeTrip =
    await getActiveTripContext(
      session.user,
    );
  const countries =
    activeTrip.countries;
  const url = new URL(
    request.url,
  );
  const requestedTripId =
    url.searchParams.get(
      "trip",
    ) ?? "";

  if (
    !requestedTripId ||
    requestedTripId !==
      activeTrip.tripId
  ) {
    await recordApiMetric({
      userId:
        session.user.id,
      route:
        "/api/dashboard/finance",
      method: "GET",
      durationMs:
        Date.now() - started,
      statusCode: 403,
    });

    return Response.json(
      {
        error:
          "Trip is not active.",
      },
      { status: 403 },
    );
  }

  const selected =
    countries.filter(
      (country) =>
        country.tripId ===
        requestedTripId,
    );
  const countryIds =
    selected.map(
      (country) =>
        country.id,
    );
  const summary =
    await buildExpenseSummary(
      countryIds,
    );
  const budget =
    await loadTripBudgetSummary(
      session.user.id,
      requestedTripId,
      countryIds,
    );
  const me =
    summary.people.find(
      (person) =>
        person.userId ===
        session.user.id,
    );
  const myShareSpent =
    me?.share ?? 0;
  const baseCurrency =
    selected[0]
      ?.baseCurrency ?? "MYR";

  const data = {
    total: summary.total,
    categories:
      summary.categories,
    baseCurrency,
    myBudget:
      budget.myBudget,
    myShareSpent,
    myRemaining:
      budget.myBudget -
      myShareSpent,
    combinedBudget:
      budget.combinedBudget,
    groupRemaining:
      budget.combinedBudget -
      summary.total,
    budgetsSubmitted:
      budget.budgetsSubmitted,
    travelerCount:
      budget.travelerCount,
  };

  await recordApiMetric({
    userId:
      session.user.id,
    route:
      "/api/dashboard/finance",
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
