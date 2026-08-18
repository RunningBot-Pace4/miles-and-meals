import Link from "next/link";
import { SettlementActionButton } from "@/components/SettlementActionButton";
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
  const displayName = session.user.name.trim() || "Traveler";
  const tripName = selectedCountries[0]?.tripName ?? "Your journey starts here";
  const me = summary.people.find((person) => person.userId === session.user.id);

  return (
    <div className="stack gap-lg dashboard-page">
      <section className="dashboard-welcome">
        <div className="dashboard-welcome-copy">
          <p className="eyebrow">YOUR TRAVEL COMPANION</p>
          <h1 className="dashboard-welcome-title">
            <span className="welcome-user">Welcome back, {displayName}.</span>
            <span className="welcome-gradient">
              Make every mile, meal &amp; memory count.
            </span>
          </h1>
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
            <div
              className="budget-track"
              aria-label={`${budgetPercent.toFixed(0)}% of budget used`}
            >
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
            <article
              className={remaining < 0 ? "stat-card danger" : "stat-card success"}
            >
              <span>Remaining</span>
              <strong>{formatMoney(remaining, baseCurrency)}</strong>
              <small>
                {remaining < 0 ? "Over planned budget" : "Available to spend"}
              </small>
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

          <section className="quick-grid" aria-label="Quick actions">
            <Link className="quick-action" href="/planner">
              <span className="quick-action-icon">▣</span>
              <span>
                <strong>Today&apos;s plan</strong>
                <small>Itinerary, food &amp; places</small>
              </span>
              <span className="quick-arrow">›</span>
            </Link>
            <Link className="quick-action" href="/settlements">
              <span className="quick-action-icon amber">✓</span>
              <span>
                <strong>Settle up</strong>
                <small>See who has paid and who is waiting</small>
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
