import { FullPageLink as Link } from "@/components/FullPageLink";
import { CountryQuickSelect } from "@/components/CountryQuickSelect";
import { SettlementActionButton } from "@/components/SettlementActionButton";
import { SettlementLiveRefresh } from "@/components/SettlementLiveRefresh";
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
  const me = summary.people.find(
    (person) => person.userId === session.user.id,
  );

  return (
    <div className="stack gap-lg dashboard-page">
      <SettlementLiveRefresh
        intervalMs={8000}
        showBadge={false}
        channels={["settlement", "expense", "planner"]}
      />
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
          <section
            className="stat-grid dashboard-stats travel-stat-grid"
            aria-label="Trip wallet summary"
          >
            <article className="stat-card travel-stat spent">
              <span className="travel-stat-icon" aria-hidden="true">
                ↗
              </span>
              <div>
                <span>Spent</span>
                <strong>
                  {formatMoney(summary.total, baseCurrency)}
                </strong>
                <small>What the trip has used</small>
              </div>
            </article>

            <article className="stat-card travel-stat budget">
              <span className="travel-stat-icon" aria-hidden="true">
                ◫
              </span>
              <div>
                <span>Budget</span>
                <strong>{formatMoney(budget, baseCurrency)}</strong>
                <small>Your travel wallet</small>
              </div>
            </article>

            <article
              className={
                remaining < 0
                  ? "stat-card travel-stat remaining danger"
                  : "stat-card travel-stat remaining success"
              }
            >
              <span className="travel-stat-icon" aria-hidden="true">
                ✦
              </span>
              <div>
                <span>Remaining</span>
                <strong>
                  {formatMoney(remaining, baseCurrency)}
                </strong>
                <small>
                  {remaining < 0
                    ? "Over planned budget"
                    : "Ready for the next stop"}
                </small>
              </div>
            </article>
          </section>

          {me ? (
            <section className="my-money-strip">
              <div>
                <span>Your personal share</span>
                <strong>{formatMoney(me.share, baseCurrency)}</strong>
              </div>
              <div>
                <span>You paid</span>
                <strong>{formatMoney(me.paid, baseCurrency)}</strong>
              </div>
              <div className={me.toPay > 0 ? "money-due" : ""}>
                <span>To pay</span>
                <strong>{formatMoney(me.toPay, baseCurrency)}</strong>
              </div>
              <div className={me.toReceive > 0 ? "money-receive" : ""}>
                <span>To receive</span>
                <strong>{formatMoney(me.toReceive, baseCurrency)}</strong>
              </div>
            </section>
          ) : null}

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
                  <p className="eyebrow">YOUR BALANCE</p>
                  <h2>What happens next</h2>
                </div>
              </div>
              {me ? (
                <div className="balance-explainer">
                  <div className="balance-big">
                    <span>
                      {me.toPay > 0
                        ? "You still need to pay"
                        : me.toReceive > 0
                          ? "You are still receiving"
                          : me.paymentSent > 0
                            ? "Waiting for confirmation"
                            : "You are all caught up"}
                    </span>
                    <strong>
                      {formatMoney(
                        me.toPay > 0
                          ? me.toPay
                          : me.toReceive > 0
                            ? me.toReceive
                            : me.paymentSent,
                        baseCurrency,
                      )}
                    </strong>
                  </div>
                  {me.paymentSent > 0 ? (
                    <p>
                      {formatMoney(me.paymentSent, baseCurrency)} has been marked
                      as sent and is waiting for the receiver to confirm.
                    </p>
                  ) : (
                    <p>
                      Miles &amp; Meals calculates this automatically from who
                      paid and everyone&apos;s personal share.
                    </p>
                  )}
                  <Link className="button settlement-action-secondary" href="/settlements">
                    Open Settle Up
                  </Link>
                </div>
              ) : (
                <p className="muted">
                  Add an expense to start calculating balances.
                </p>
              )}
            </article>
          </section>

          <section className="panel people-ledger-panel">
            <div className="panel-title">
              <div>
                <p className="eyebrow">TRIP CREW</p>
                <h2>Paid vs personal share</h2>
              </div>
              <Link className="panel-link" href="/settlements">
                Settlement details
              </Link>
            </div>

            <div className="people-ledger-grid">
              {summary.people.map((person) => (
                <article
                  className={
                    person.userId === session.user.id
                      ? "person-ledger-card current-person"
                      : "person-ledger-card"
                  }
                  key={person.userId}
                >
                  <div className="person-ledger-head">
                    <span className="avatar">
                      {person.name.trim().charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <strong>{person.name}</strong>
                      <small>
                        {person.userId === session.user.id ? "You" : "Traveler"}
                      </small>
                    </div>
                  </div>

                  <div className="person-ledger-metrics">
                    <div>
                      <span>Paid</span>
                      <strong>{formatMoney(person.paid, baseCurrency)}</strong>
                    </div>
                    <div>
                      <span>Personal share</span>
                      <strong>{formatMoney(person.share, baseCurrency)}</strong>
                    </div>
                    <div className="metric-receive">
                      <span>To receive</span>
                      <strong>
                        {formatMoney(person.toReceive, baseCurrency)}
                      </strong>
                    </div>
                    <div className="metric-pay">
                      <span>To pay</span>
                      <strong>{formatMoney(person.toPay, baseCurrency)}</strong>
                    </div>
                  </div>

                  {person.paymentSent > 0 ? (
                    <small className="person-status-note">
                      ✓ {formatMoney(person.paymentSent, baseCurrency)} payment
                      sent · waiting for confirmation
                    </small>
                  ) : null}
                </article>
              ))}
            </div>
          </section>

          <section className="panel settlement-panel">
            <div className="panel-title">
              <div>
                <p className="eyebrow">SETTLE UP</p>
                <h2>Who paid, who&apos;s waiting</h2>
              </div>
              <Link className="panel-link" href="/settlements">
                View history
              </Link>
            </div>

            <div className="settlement-status-list">
              {summary.pendingSettlements.map((payment) => (
                <article className="settlement-status-row sent" key={payment.id}>
                  <div className="settlement-status-icon">↗</div>
                  <div className="settlement-status-copy">
                    <strong>
                      {payment.fromUserId === session.user.id
                        ? `You paid ${payment.toName}`
                        : payment.toUserId === session.user.id
                          ? `${payment.fromName} marked payment sent`
                          : `${payment.fromName} → ${payment.toName}`}
                    </strong>
                    <small>
                      {payment.countryName} · Payment sent · Waiting for
                      confirmation
                    </small>
                  </div>
                  <strong className="settlement-amount">
                    {formatMoney(payment.amount, payment.currency)}
                  </strong>
                  {payment.toUserId === session.user.id ? (
                    <SettlementActionButton
                      action="MARK_RECEIVED"
                      countryId={payment.countryId}
                      counterpartyUserId={payment.fromUserId}
                      label="Confirm received"
                    />
                  ) : null}
                </article>
              ))}

              {summary.waitingTransfers.map((transfer, index) => (
                <article
                  className="settlement-status-row waiting"
                  key={`${transfer.countryId}-${transfer.fromUserId}-${transfer.toUserId}-${index}`}
                >
                  <div className="settlement-status-icon">○</div>
                  <div className="settlement-status-copy">
                    <strong>
                      {transfer.fromUserId === session.user.id
                        ? `You owe ${transfer.toName}`
                        : transfer.toUserId === session.user.id
                          ? `${transfer.fromName} owes you`
                          : `${transfer.fromName} → ${transfer.toName}`}
                    </strong>
                    <small>{transfer.countryName} · Waiting for payment</small>
                  </div>
                  <strong className="settlement-amount">
                    {formatMoney(transfer.amount, transfer.currency)}
                  </strong>

                  {transfer.fromUserId === session.user.id ? (
                    <SettlementActionButton
                      action="MARK_PAID"
                      countryId={transfer.countryId}
                      counterpartyUserId={transfer.toUserId}
                      label="Mark paid"
                    />
                  ) : transfer.toUserId === session.user.id ? (
                    <SettlementActionButton
                      action="MARK_RECEIVED"
                      countryId={transfer.countryId}
                      counterpartyUserId={transfer.fromUserId}
                      label="Mark received"
                    />
                  ) : null}
                </article>
              ))}

              {!summary.pendingSettlements.length &&
              !summary.waitingTransfers.length ? (
                <div className="settled-state">
                  <span aria-hidden="true">✓</span>
                  <div>
                    <strong>Everyone is settled</strong>
                    <small>No outstanding trip balances.</small>
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
