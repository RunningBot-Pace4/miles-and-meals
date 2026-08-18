import Link from "next/link";
import { listAccessibleCountries } from "@/lib/access";
import { buildExpenseSummary } from "@/lib/dashboard";
import { formatMoney, toNumber } from "@/lib/money";
import { isSystemAdmin, requirePageSession } from "@/lib/session";

type DashboardPageProps = {
  searchParams: Promise<{ country?: string }>;
};

const categoryIcons: Record<string, string> = {
  Food: "🥢",
  Flights: "✈",
  Hotel: "⌂",
  Transport: "↗",
  Attractions: "◎",
  Shopping: "◇",
  Other: "•",
};

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
        ...new Map(
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
  const firstName = admin
    ? "Admin"
    : session.user.name.trim().split(/\s+/)[0] || "traveler";
  const tripName = selectedCountries[0]?.tripName ?? "Your journey starts here";

  return (
    <div className="stack gap-lg dashboard-page">
      <section className="dashboard-welcome">
        <div>
          <p className="eyebrow">MILES &amp; MEALS</p>
          <h1>Ready for the next stop, {firstName}?</h1>
          <p className="muted">Everything for the trip, without the spreadsheet scroll.</p>
        </div>
        <Link className="button primary dashboard-add" href="/expenses/new">
          <span aria-hidden="true">＋</span>
          Add expense
        </Link>
      </section>

      <section className="hero-card dashboard-hero">
        <div className="hero-main">
          <div>
            <p className="eyebrow">CURRENT TRIP</p>
            <h2>{tripName}</h2>
            <p className="muted-on-dark">
              {selectedId
                ? selectedCountries[0]?.name
                : countries.length
                  ? `${countries.length} accessible countr${countries.length === 1 ? "y" : "ies"}`
                  : admin
                    ? "Create a trip, add a country and bring your crew"
                    : "Waiting for country access"}
            </p>
          </div>

          {countries.length ? (
            <form className="country-filter">
              <select
                aria-label="Country filter"
                defaultValue={selectedId}
                name="country"
              >
                <option value="">All countries</option>
                {countries.map((country) => (
                  <option value={country.id} key={country.id}>
                    {country.name}
                  </option>
                ))}
              </select>
              <button className="button hero-filter-button" type="submit">
                View
              </button>
            </form>
          ) : null}
        </div>

        {countries.length ? (
          <div className="hero-budget">
            <div className="hero-budget-row">
              <span>Trip spend</span>
              <strong>{formatMoney(summary.total, baseCurrency)}</strong>
            </div>
            <div className="budget-track" aria-label={`${budgetPercent.toFixed(0)}% of budget used`}>
              <span style={{ width: `${budgetPercent}%` }} />
            </div>
            <div className="hero-budget-foot">
              <span>{budgetPercent.toFixed(0)}% used</span>
              <span>Budget {formatMoney(budget, baseCurrency)}</span>
            </div>
          </div>
        ) : null}
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
                <p className="eyebrow">FIRST TRIP SETUP</p>
                <h2>Build your first adventure</h2>
                <p className="muted">
                  Start with a trip, add the countries you will visit, then
                  assign travelers so everyone only sees the right trip data.
                </p>
                <Link className="button primary" href="/admin">
                  Open Admin setup
                </Link>
              </div>
            </div>

            <div className="onboarding-steps">
              <article>
                <span>01</span>
                <div>
                  <strong>Create a trip</strong>
                  <small>Name, dates, base currency and budget</small>
                </div>
              </article>
              <article>
                <span>02</span>
                <div>
                  <strong>Add countries</strong>
                  <small>Local currency and default exchange rate</small>
                </div>
              </article>
              <article>
                <span>03</span>
                <div>
                  <strong>Assign your crew</strong>
                  <small>Give each traveler country-level access</small>
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
          <section className="stat-grid dashboard-stats">
            <article className="stat-card featured">
              <span>Spent</span>
              <strong>{formatMoney(summary.total, baseCurrency)}</strong>
              <small>Across selected countries</small>
            </article>
            <article className="stat-card">
              <span>Budget</span>
              <strong>{formatMoney(budget, baseCurrency)}</strong>
              <small>Planned trip total</small>
            </article>
            <article className={remaining < 0 ? "stat-card danger" : "stat-card success"}>
              <span>Remaining</span>
              <strong>{formatMoney(remaining, baseCurrency)}</strong>
              <small>{remaining < 0 ? "Over planned budget" : "Available to spend"}</small>
            </article>
          </section>

          <section className="quick-grid" aria-label="Quick actions">
            <Link className="quick-action" href="/planner">
              <span className="quick-action-icon">▣</span>
              <span>
                <strong>Today&apos;s plan</strong>
                <small>Itinerary, food &amp; places</small>
              </span>
              <span className="quick-arrow">›</span>
            </Link>
            <Link className="quick-action" href="/location">
              <span className="quick-action-icon amber">⌖</span>
              <span>
                <strong>Find the crew</strong>
                <small>See shared live locations</small>
              </span>
              <span className="quick-arrow">›</span>
            </Link>
          </section>

          <section className="content-grid">
            <article className="panel dashboard-panel">
              <div className="panel-title">
                <div>
                  <p className="eyebrow">SPENDING</p>
                  <h2>By category</h2>
                </div>
                <Link className="panel-link" href="/expenses">
                  View all
                </Link>
              </div>
              <div className="category-list">
                {summary.categories.length ? (
                  summary.categories.map((item) => {
                    const percentage =
                      summary.total > 0
                        ? Math.min(100, (item.amount / summary.total) * 100)
                        : 0;

                    return (
                      <div className="category-row" key={item.category}>
                        <span className="category-icon">
                          {categoryIcons[item.category] ?? "•"}
                        </span>
                        <div className="category-copy">
                          <div>
                            <span>{item.category}</span>
                            <strong>{formatMoney(item.amount, baseCurrency)}</strong>
                          </div>
                          <span className="category-track">
                            <span style={{ width: `${percentage}%` }} />
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="muted">No expenses yet.</p>
                )}
              </div>
            </article>

            <article className="panel dashboard-panel">
              <div className="panel-title">
                <div>
                  <p className="eyebrow">TRIP CREW</p>
                  <h2>Who paid</h2>
                </div>
              </div>
              <div className="payer-list">
                {summary.payers.length ? (
                  summary.payers.map((payer) => (
                    <div className="payer-row" key={payer.userId}>
                      <span className="avatar">
                        {payer.name.trim().charAt(0).toUpperCase()}
                      </span>
                      <span className="payer-copy">
                        <strong>{payer.name}</strong>
                        <small>Paid so far</small>
                      </span>
                      <strong>{formatMoney(payer.amount, baseCurrency)}</strong>
                    </div>
                  ))
                ) : (
                  <p className="muted">No payer activity yet.</p>
                )}
              </div>
            </article>
          </section>

          <section className="panel settlement-panel">
            <div className="panel-title">
              <div>
                <p className="eyebrow">SETTLEMENT</p>
                <h2>Keep it fair</h2>
              </div>
            </div>
            <div className="list">
              {summary.settlements.length ? (
                summary.settlements.map((settlement, index) => (
                  <div
                    className="settlement-row"
                    key={`${settlement.fromUserId}-${settlement.toUserId}-${index}`}
                  >
                    <div className="settlement-route">
                      <span className="avatar small">
                        {settlement.fromName.trim().charAt(0).toUpperCase()}
                      </span>
                      <span>
                        <strong>{settlement.fromName}</strong>
                        <small> pays {settlement.toName}</small>
                      </span>
                    </div>
                    <strong className="settlement-amount">
                      {formatMoney(settlement.amount, baseCurrency)}
                    </strong>
                  </div>
                ))
              ) : (
                <div className="settled-state">
                  <span aria-hidden="true">✓</span>
                  <div>
                    <strong>Everyone is settled</strong>
                    <small>No outstanding trip balances.</small>
                  </div>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
