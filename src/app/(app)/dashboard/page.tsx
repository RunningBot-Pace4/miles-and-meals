import { FullPageLink as Link } from "@/components/FullPageLink";
import { CountryQuickSelect } from "@/components/CountryQuickSelect";
import { LiveDashboardFinance } from "@/components/LiveDashboardFinance";
import { LiveSettlementWorkspace } from "@/components/LiveSettlementWorkspace";
import { listAccessibleCountries } from "@/lib/access";
import { buildExpenseSummary } from "@/lib/dashboard";
import { formatMoney, toNumber } from "@/lib/money";
import { isSystemAdmin, requirePageSession } from "@/lib/session";
import { serializeSettlementLiveData } from "@/lib/settlement-live";

type DashboardPageProps = {
  searchParams: Promise<{ country?: string }>;
};

function StyledTripTitle({
  text,
}: {
  text: string;
}) {
  const match = text.match(
    /^(.*?)(?:\s+(\d{4}))?(?:\s+(\(.+\)))?$/,
  );

  const name = match?.[1]?.trim() || text;
  const year = match?.[2] ?? "";
  const note = match?.[3] ?? "";

  return (
    <span className="travel-title-editorial" aria-label={text}>
      <span className="travel-title-name">{name}</span>
      {year ? (
        <span className="travel-title-year">{year}</span>
      ) : null}
      {note ? (
        <span className="travel-title-note">{note}</span>
      ) : null}
    </span>
  );
}

function formatTripDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): string {
  if (!startDate && !endDate) {
    return "Dates not set";
  }

  const formatter = new Intl.DateTimeFormat("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  function format(value: string): string {
    const [year, month, day] = value.split("-").map(Number);
    return formatter.format(
      new Date(year, month - 1, day),
    );
  }

  if (startDate && endDate) {
    return `${format(startDate)} – ${format(endDate)}`;
  }

  return format(startDate ?? endDate ?? "");
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const session = await requirePageSession();
  const countries = await listAccessibleCountries(session.user);
  const query = await searchParams;
  const selectedId =
    query.country && countries.some((country) => country.id === query.country)
      ? query.country
      : "";

  const selectedCountries = selectedId
    ? countries.filter((country) => country.id === selectedId)
    : countries;

  const summary = await buildExpenseSummary(
    selectedCountries.map((country) => country.id),
  );

  const baseCurrency = selectedCountries[0]?.baseCurrency ?? "MYR";
  const budget = selectedId
    ? toNumber(selectedCountries[0]?.budget)
    : [
        ...new Map<string, number>(
          selectedCountries.map((country) => [
            country.tripId,
            toNumber(country.budget),
          ]),
        ).values(),
      ].reduce((sum, tripBudget) => sum + tripBudget, 0);

  const remaining = budget - summary.total;
  const budgetPercent =
    budget > 0 ? Math.min(100, Math.max(0, (summary.total / budget) * 100)) : 0;
  const admin = isSystemAdmin(session.user.role);
  const displayName = session.user.name.trim() || "Traveler";
  const selectedCountry =
    selectedId ? selectedCountries[0] : null;
  const uniqueTripIds = new Set(
    selectedCountries.map((country) => country.tripId),
  );
  const singleTrip =
    uniqueTripIds.size === 1
      ? selectedCountries[0]
      : null;
  const heroDestination =
    selectedCountry?.tripName ??
    singleTrip?.tripName ??
    (countries.length
      ? "All assigned trips"
      : "No trip assigned");
  const heroCode =
    selectedCountry?.code ??
    (selectedCountries.length === 1
      ? selectedCountries[0]?.code
      : countries.length
        ? "ALL"
        : "—");
  const tripDateLabel =
    singleTrip || selectedCountry
      ? formatTripDateRange(
          (selectedCountry ?? singleTrip)?.startDate,
          (selectedCountry ?? singleTrip)?.endDate,
        )
      : "Multiple trip dates";
  const heroSecondary =
    selectedCountry
      ? selectedCountry.name
      : selectedCountries.length
        ? `${selectedCountries.length} destination${selectedCountries.length === 1 ? "" : "s"} ready`
        : admin
          ? "Assign your Admin account to a country in Travel Crew"
          : "Waiting for country access";
  const settlementLiveData =
    serializeSettlementLiveData(
      summary,
      baseCurrency,
    );
  const financeLiveData = {
    total: summary.total,
    categories: summary.categories,
    budget,
    remaining,
    baseCurrency,
  };

  return (
    <div className="stack gap-lg dashboard-page">
      <section className="dashboard-welcome">
        <div className="dashboard-welcome-copy">
          <p className="eyebrow">YOUR TRAVEL COMPANION</p>
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
              <strong className="tagline-mile">mile</strong>,{" "}
              <strong className="tagline-meal">meal</strong>{" "}
              &amp;{" "}
              <strong className="tagline-memory">
                memory
              </strong>{" "}
              count.
            </span>
          </h1>
        </div>
        <Link className="button primary dashboard-add" href="/expenses/new">
          <span aria-hidden="true">＋</span>
          Add expense
        </Link>
      </section>

      <section className="hero-card dashboard-hero dashboard-travel-hero">
        <div
          className="travel-boarding-stamp"
          aria-hidden="true"
        >
          <small>BOARDING</small>
          <strong>{heroCode}</strong>
        </div>

        <div className="hero-main">
          <div className="travel-destination-block">
            <p className="eyebrow travel-eyebrow">
              <span aria-hidden="true">✦</span>
              CURRENT JOURNEY
            </p>

            <div className="travel-destination-heading">
              <div>
                <small className="travel-destination-label">
                  {selectedCountry
                    ? "Destination"
                    : "Trip"}
                </small>
                <h2 className="travel-title-wrap">
                  <StyledTripTitle text={heroDestination} />
                </h2>
                <p className="muted-on-dark">
                  {heroSecondary}
                </p>
              </div>

              <span className="travel-country-code">
                {heroCode}
              </span>
            </div>

            {countries.length ? (
              <div className="travel-hero-meta">
                <span>
                  <b aria-hidden="true">◷</b>
                  {tripDateLabel}
                </span>
                <span>
                  <b aria-hidden="true">⌖</b>
                  {selectedCountry
                    ? `${selectedCountry.currencyCode} local currency`
                    : `${selectedCountries.length} destination${selectedCountries.length === 1 ? "" : "s"}`}
                </span>
              </div>
            ) : null}
          </div>

          {countries.length ? (
            <CountryQuickSelect
              countries={countries.map((country) => ({
                id: country.id,
                tripName: country.tripName,
              }))}
              selectedId={selectedId}
            />
          ) : null}
        </div>

        {countries.length ? (
          <div className="hero-budget travel-wallet-card">
            <div className="travel-wallet-title">
              <span className="travel-wallet-icon" aria-hidden="true">
                ◈
              </span>
              <div>
                <small>TRIP WALLET</small>
                <strong>{baseCurrency}</strong>
              </div>
            </div>

            <div className="hero-budget-row">
              <span>Trip spend</span>
              <strong>
                {formatMoney(summary.total, baseCurrency)}
              </strong>
            </div>

            <div
              className="budget-track"
              aria-label={`${budgetPercent.toFixed(0)}% of budget used`}
            >
              <span style={{ width: `${budgetPercent}%` }} />
            </div>

            <div className="hero-budget-foot">
              <span>{budgetPercent.toFixed(0)}% used</span>
              <span>
                Budget {formatMoney(budget, baseCurrency)}
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
          <span className="travel-route-plane">✈</span>
          <span className="travel-route-line second" />
          <span className="travel-route-dot end" />
        </div>
      </section>

      {countries.length === 0 ? (
        admin ? (
          <section className="admin-onboarding">
            <div className="admin-onboarding-copy">
              <div className="onboarding-orbit" aria-hidden="true">
                <span className="orbit-pin">⌖</span>
                <span className="orbit-dot dot-one" />
                <span className="orbit-dot dot-two" />
              </div>
              <div>
                <p className="eyebrow">COUNTRY ACCESS</p>
                <h2>No trip country assigned to you</h2>
                <p className="muted">
                  Admin tools remain available, but travel pages only show
                  countries explicitly assigned to your account.
                </p>
                <Link className="button primary" href="/admin">
                  Manage country access
                </Link>
              </div>
            </div>

            <div className="onboarding-steps">
              <article>
                <span>01</span>
                <div>
                  <strong>Open Travel Crew</strong>
                  <small>Expand the user who needs trip access</small>
                </div>
              </article>
              <article>
                <span>02</span>
                <div>
                  <strong>Manage country access</strong>
                  <small>Tick the trip countries that user can see</small>
                </div>
              </article>
              <article>
                <span>03</span>
                <div>
                  <strong>Return to the app</strong>
                  <small>Only assigned trip data will be visible</small>
                </div>
              </article>
            </div>
          </section>
        ) : (
          <section className="empty-card empty-card-feature">
            <div className="empty-icon">⌖</div>
            <div>
              <h2>No country assigned yet</h2>
              <p>
                An admin needs to assign your account to a country before trip
                information becomes visible.
              </p>
            </div>
          </section>
        )
      ) : (
        <>
          <LiveDashboardFinance
            initialData={
              financeLiveData
            }
            countryId={selectedId}
          />


          <LiveSettlementWorkspace
            initialData={
              settlementLiveData
            }
            currentUserId={
              session.user.id
            }
            countryId={selectedId}
            variant="dashboard"
          />


          <section
            className="dashboard-travel-shortcuts"
            aria-labelledby="travel-shortcuts-title"
          >
            <div className="travel-section-heading">
              <div>
                <p className="eyebrow">TRAVEL SHORTCUTS</p>
                <h2 id="travel-shortcuts-title">Where next?</h2>
              </div>
              <span>Eat · Play · Sleep · Share</span>
            </div>

            <div className="quick-grid travel-quick-grid">
              <Link className="quick-action travel-quick plan" href="/planner">
                <span className="quick-action-icon">⌁</span>
                <span>
                  <strong>Explore the plan</strong>
                  <small>Itinerary, food &amp; places</small>
                </span>
                <span className="quick-arrow">›</span>
              </Link>

              <Link className="quick-action travel-quick map" href="/location">
                <span className="quick-action-icon">⌖</span>
                <span>
                  <strong>Find the crew</strong>
                  <small>See shared live locations</small>
                </span>
                <span className="quick-arrow">›</span>
              </Link>

              <Link className="quick-action travel-quick wallet" href="/expenses">
                <span className="quick-action-icon">▤</span>
                <span>
                  <strong>Trip wallet</strong>
                  <small>Receipts, spending &amp; shares</small>
                </span>
                <span className="quick-arrow">›</span>
              </Link>

              <Link
                className="quick-action travel-quick settle"
                href="/settlements"
              >
                <span className="quick-action-icon">✓</span>
                <span>
                  <strong>Settle up</strong>
                  <small>Who paid and who is waiting</small>
                </span>
                <span className="quick-arrow">›</span>
              </Link>
            </div>
          </section>



        </>
      )}
    </div>
  );
}
