import { FullPageLink as Link } from "@/components/FullPageLink";
import { LiveDashboardFinance } from "@/components/LiveDashboardFinance";
import { LiveSettlementWorkspace } from "@/components/LiveSettlementWorkspace";
import { TripQuickSelect } from "@/components/TripQuickSelect";
import {
  getActiveTripContext,
} from "@/lib/active-trip";
import { buildExpenseSummary } from "@/lib/dashboard";
import { loadAllTripsDashboardData } from "@/lib/dashboard-scope";
import { formatMoney } from "@/lib/money";
import {
  isSystemAdmin,
  requirePageSession,
} from "@/lib/session";
import { serializeSettlementLiveData } from "@/lib/settlement-live";
import {
  loadTripBudgetSummary,
} from "@/lib/trip-budget";

function StyledTripTitle({
  text,
}: {
  text: string;
}) {
  const match = text.match(
    /^(.*?)(?:\s+(\d{4}))?(?:\s+(\(.+\)))?$/,
  );

  const name =
    match?.[1]?.trim() ||
    text;
  const year =
    match?.[2] ?? "";
  const note =
    match?.[3] ?? "";

  return (
    <span
      className="travel-title-editorial"
      aria-label={text}
    >
      <span className="travel-title-name">
        {name}
      </span>
      {year ? (
        <span className="travel-title-year">
          {year}
        </span>
      ) : null}
      {note ? (
        <span className="travel-title-note">
          {note}
        </span>
      ) : null}
    </span>
  );
}

function formatTripDateRange(
  startDate:
    | string
    | null
    | undefined,
  endDate:
    | string
    | null
    | undefined,
): string {
  if (
    !startDate &&
    !endDate
  ) {
    return "Dates not set";
  }

  const formatter =
    new Intl.DateTimeFormat(
      "en-MY",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      },
    );

  function format(
    value: string,
  ): string {
    const [
      year,
      month,
      day,
    ] = value
      .split("-")
      .map(Number);

    return formatter.format(
      new Date(
        year,
        month - 1,
        day,
      ),
    );
  }

  if (
    startDate &&
    endDate
  ) {
    return `${format(
      startDate,
    )} – ${format(endDate)}`;
  }

  return format(
    startDate ??
      endDate ??
      "",
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
  }>;
}) {
  const query = await searchParams;
  const session =
    await requirePageSession();
  const activeTrip =
    await getActiveTripContext(
      session.user,
    );
  const tripOptions =
    activeTrip.trips;
  const viewAll =
    query.view !== "trip" &&
    tripOptions.length > 0;
  const requestedTripId =
    activeTrip.tripId;
  const selectedTrip =
    tripOptions.find(
      (trip) =>
        trip.id ===
        requestedTripId,
    ) ?? null;
  const selectedCountries =
    activeTrip.countries;
  const countryIds =
    selectedCountries.map(
      (country) => country.id,
    );

  const [summary, budget, allTripsData] =
    await Promise.all([
      buildExpenseSummary(countryIds),
      requestedTripId
        ? loadTripBudgetSummary(
            session.user.id,
            requestedTripId,
            countryIds,
          )
        : Promise.resolve({
            myBudget: 0,
            combinedBudget: 0,
            budgetsSubmitted: 0,
            travelerCount: 0,
            missingBudgetCount: 0,
          }),
      viewAll
        ? loadAllTripsDashboardData(
            session.user.id,
            activeTrip,
          )
        : Promise.resolve(null),
    ]);

  const me = summary.people.find(
    (person) =>
      person.userId ===
      session.user.id,
  );
  const individualMyShareSpent =
    me?.share ?? 0;
  const baseCurrency =
    allTripsData?.finance.baseCurrency ??
    selectedTrip?.baseCurrency ??
    "MYR";
  const myShareSpent =
    allTripsData?.finance.myShareSpent ??
    individualMyShareSpent;
  const displayMyBudget =
    allTripsData?.finance.myBudget ??
    budget.myBudget;
  const admin =
    isSystemAdmin(
      session.user.role,
    );
  const displayName =
    session.user.name.trim() ||
    "Traveler";
  const allTripStartDates =
    tripOptions
      .map((trip) => trip.startDate)
      .filter((value): value is string => Boolean(value))
      .sort();
  const allTripEndDates =
    tripOptions
      .map((trip) => trip.endDate)
      .filter((value): value is string => Boolean(value))
      .sort();
  const allTripDateLabel =
    formatTripDateRange(
      allTripStartDates[0],
      allTripEndDates.at(-1),
    );
  const heroDestination =
    viewAll
      ? "All trips"
      : selectedTrip?.name ??
        "Plan your next trip";
  const heroCode =
    viewAll
      ? "ALL"
      : selectedCountries.length ===
        1
        ? selectedCountries[0]
            ?.code ?? "TRIP"
        : selectedCountries.length >
            1
          ? "TRIP"
          : "NEW";
  const tripDateLabel =
    viewAll
      ? allTripDateLabel
      : selectedTrip
        ? formatTripDateRange(
            selectedTrip.startDate,
            selectedTrip.endDate,
          )
        : "Dates not set";
  const heroSecondary =
    viewAll
      ? `${tripOptions.length} trip${
          tripOptions.length === 1
            ? ""
            : "s"
        } ready`
      : selectedCountries.length
        ? `${selectedCountries.length} destination${
            selectedCountries.length ===
            1
              ? ""
              : "s"
          } ready`
        : "Create a trip or join a destination";
  const personalPercent =
    displayMyBudget > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (
              myShareSpent /
              displayMyBudget
            ) * 100,
          ),
        )
      : 0;

  const settlementLiveData =
    allTripsData?.settlement ??
    serializeSettlementLiveData(
      summary,
      baseCurrency,
    );

  const financeLiveData =
    allTripsData?.finance ?? {
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

  return (
    <div className="stack gap-lg dashboard-page">
      <section className="dashboard-welcome">
        <div className="dashboard-welcome-copy">
          <p className="eyebrow">
            YOUR TRAVEL COMPANION
          </p>
          <h1 className="dashboard-welcome-title">
            <span className="welcome-editorial">
              <span className="welcome-prefix">
                Welcome back,
              </span>{" "}
              <span className="welcome-name">
                {displayName}.
              </span>
            </span>

            <span className="welcome-tagline">
              Make every{" "}
              <strong className="tagline-mile">
                mile
              </strong>
              ,{" "}
              <strong className="tagline-meal">
                meal
              </strong>{" "}
              &amp;{" "}
              <strong className="tagline-memory">
                memory
              </strong>{" "}
              count.
            </span>
          </h1>
        </div>

        {selectedTrip ? (
          <Link
            className="button primary dashboard-add"
            href="/expenses/new"
          >
            <span aria-hidden="true">
              ＋
            </span>
            Add expense
          </Link>
        ) : (
          <Link
            className="button primary dashboard-add"
            href="/trips"
          >
            <span aria-hidden="true">
              ＋
            </span>
            Create trip
          </Link>
        )}
      </section>

      <section className="hero-card dashboard-hero dashboard-travel-hero">
        <div
          className="travel-boarding-stamp"
          aria-hidden="true"
        >
          <small>
            BOARDING
          </small>
          <strong>
            {heroCode}
          </strong>
        </div>

        <div className="hero-main">
          <div className="travel-destination-block">
            <p className="eyebrow travel-eyebrow">
              <span aria-hidden="true">
                ✦
              </span>
              CURRENT JOURNEY
            </p>

            <div className="travel-destination-heading">
              <div>
                <small className="travel-destination-label">
                  Trip
                </small>
                <h2 className="travel-title-wrap">
                  <StyledTripTitle
                    text={
                      heroDestination
                    }
                  />
                </h2>
                <p className="muted-on-dark">
                  {
                    heroSecondary
                  }
                </p>
              </div>

              <span className="travel-country-code">
                {heroCode}
              </span>
            </div>

            {selectedTrip ? (
              <div className="travel-hero-meta">
                <span>
                  <b aria-hidden="true">
                    ◷
                  </b>
                  {tripDateLabel}
                </span>
                <span>
                  <b aria-hidden="true">
                    ⌖
                  </b>
                  {viewAll
                    ? `${allTripsData?.destinationCount ?? activeTrip.allCountries.length} destinations`
                    : `${selectedCountries.length} destination${
                        selectedCountries.length === 1 ? "" : "s"
                      }`}
                </span>
              </div>
            ) : null}
          </div>

          {tripOptions.length ? (
            <TripQuickSelect
              trips={
                tripOptions
              }
              selectedId={
                requestedTripId
              }
              viewAll={viewAll}
            />
          ) : null}
        </div>

        {selectedTrip ? (
          <div className="hero-budget travel-wallet-card">
            <div className="travel-wallet-title">
              <span
                className="travel-wallet-icon"
                aria-hidden="true"
              >
                ◈
              </span>
              <div>
                <small>
                  MY WALLET
                </small>
                <strong>
                  {
                    baseCurrency
                  }
                </strong>
              </div>
            </div>

            <div className="hero-budget-row">
              <span>
                My share spent
              </span>
              <strong>
                {formatMoney(
                  myShareSpent,
                  baseCurrency,
                )}
              </strong>
            </div>

            <div
              className="budget-track"
              aria-label={`${personalPercent.toFixed(
                0,
              )}% of personal budget used`}
            >
              <span
                style={{
                  width: `${personalPercent}%`,
                }}
              />
            </div>

            <div className="hero-budget-foot">
              <span>
                {personalPercent.toFixed(
                  0,
                )}
                % used
              </span>
              <span>
                My budget{" "}
                {formatMoney(
                  displayMyBudget,
                  baseCurrency,
                )}
              </span>
            </div>
          </div>
        ) : null}

        <div
          className="travel-route-decoration"
          aria-hidden="true"
        >
          <span className="travel-route-dot start" />
          <span className="travel-route-line" />
          <span className="travel-route-plane">
            ✈
          </span>
          <span className="travel-route-line second" />
          <span className="travel-route-dot end" />
        </div>
      </section>

      {!selectedTrip ? (
        <section className="empty-card empty-card-feature dashboard-self-service-empty">
          <div className="empty-icon">
            ✦
          </div>

          <div>
            <h2>
              Start your own trip
            </h2>
            <p>
              You no longer need a System Admin to begin. Create a trip, choose its destination and assign your travel crew yourself.
            </p>

            <div className="dashboard-empty-actions">
              <Link
                className="button primary"
                href="/trips"
              >
                Create &amp; manage trips
              </Link>

              {admin ? (
                <Link
                  className="button secondary"
                  href="/admin"
                >
                  System Admin
                </Link>
              ) : null}
            </div>
          </div>
        </section>
      ) : (
        <>
          <LiveDashboardFinance
            initialData={
              financeLiveData
            }
            tripId={
              requestedTripId
            }
            allTrips={viewAll}
          />

          <LiveSettlementWorkspace
            initialData={
              settlementLiveData
            }
            currentUserId={
              session.user.id
            }
            tripId={
              requestedTripId
            }
            allTrips={viewAll}
            variant="dashboard"
          />

          <section
            className="dashboard-travel-shortcuts"
            aria-labelledby="travel-shortcuts-title"
          >
            <div className="travel-section-heading">
              <div>
                <p className="eyebrow">
                  TRAVEL SHORTCUTS
                </p>
                <h2 id="travel-shortcuts-title">
                  Where next?
                </h2>
              </div>
              <span>
                Eat · Play · Sleep · Share
              </span>
            </div>

            <div className="quick-grid travel-quick-grid">
              <Link
                className="quick-action travel-quick plan"
                href="/planner"
              >
                <span className="quick-action-icon">
                  ⌁
                </span>
                <span>
                  <strong>
                    Explore the plan
                  </strong>
                  <small>
                    Itinerary, food &amp; places
                  </small>
                </span>
                <span className="quick-arrow">
                  ›
                </span>
              </Link>

              <Link
                className="quick-action travel-quick map"
                href="/location"
              >
                <span className="quick-action-icon">
                  ⌖
                </span>
                <span>
                  <strong>
                    Find the crew
                  </strong>
                  <small>
                    See shared live locations
                  </small>
                </span>
                <span className="quick-arrow">
                  ›
                </span>
              </Link>

              <Link
                className="quick-action travel-quick wallet"
                href="/expenses"
              >
                <span className="quick-action-icon">
                  ▤
                </span>
                <span>
                  <strong>
                    Trip wallet
                  </strong>
                  <small>
                    Receipts, spending &amp; shares
                  </small>
                </span>
                <span className="quick-arrow">
                  ›
                </span>
              </Link>

              <Link
                className="quick-action travel-quick settle"
                href="/settlements"
              >
                <span className="quick-action-icon">
                  ✓
                </span>
                <span>
                  <strong>
                    Settle up
                  </strong>
                  <small>
                    Who paid and who is waiting
                  </small>
                </span>
                <span className="quick-arrow">
                  ›
                </span>
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
