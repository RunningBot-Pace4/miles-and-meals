import Link from "next/link";
import { SettlementActionButton } from "@/components/SettlementActionButton";
import { listAccessibleCountries } from "@/lib/access";
import { buildExpenseSummary } from "@/lib/dashboard";
import { formatMoney } from "@/lib/money";
import { requirePageSession } from "@/lib/session";

type SettlementsPageProps = {
  searchParams: Promise<{ country?: string }>;
};

export default async function SettlementsPage({
  searchParams,
}: SettlementsPageProps) {
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
  const me = summary.people.find((person) => person.userId === session.user.id);

  return (
    <div className="stack gap-lg settle-page">
      <div className="page-heading settlement-page-heading">
        <div>
          <p className="eyebrow">MONEY BETWEEN FRIENDS</p>
          <h1>Settle Up</h1>
          <p className="muted">
            No manual amount entry. Balances come directly from expenses and
            personal shares.
          </p>
        </div>
        <Link className="button settlement-action-secondary" href="/expenses">
          View expenses
        </Link>
      </div>

      {countries.length ? (
        <section className="panel settle-filter-panel">
          <form className="settle-country-filter">
            <label>
              Country
              <select defaultValue={selectedId} name="country">
                <option value="">All countries</option>
                {countries.map((country) => (
                  <option value={country.id} key={country.id}>
                    {country.tripName} · {country.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="button primary" type="submit">
              View
            </button>
          </form>
        </section>
      ) : null}

      {me ? (
        <section className="settle-summary-grid">
          <article className="settle-summary-card">
            <span>Your personal share</span>
            <strong>{formatMoney(me.share, baseCurrency)}</strong>
            <small>What you used across these expenses</small>
          </article>
          <article className="settle-summary-card">
            <span>You paid</span>
            <strong>{formatMoney(me.paid, baseCurrency)}</strong>
            <small>Expenses you paid upfront</small>
          </article>
          <article className="settle-summary-card receive">
            <span>Still to receive</span>
            <strong>{formatMoney(me.toReceive, baseCurrency)}</strong>
            <small>Includes payments awaiting your confirmation</small>
          </article>
          <article className="settle-summary-card pay">
            <span>Still to pay</span>
            <strong>{formatMoney(me.toPay, baseCurrency)}</strong>
            <small>
              {me.paymentSent > 0
                ? `${formatMoney(me.paymentSent, baseCurrency)} already marked sent`
                : "No manual calculation needed"}
            </small>
          </article>
        </section>
      ) : null}

      <section className="panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">CURRENT STATUS</p>
            <h2>Waiting &amp; payment sent</h2>
          </div>
        </div>

        <div className="settlement-status-list">
          {summary.pendingSettlements.map((payment) => (
            <article className="settlement-status-row sent" key={payment.id}>
              <div className="settlement-status-icon">↗</div>
              <div className="settlement-status-copy">
                <strong>
                  {payment.fromUserId === session.user.id
                    ? `You → ${payment.toName}`
                    : payment.toUserId === session.user.id
                      ? `${payment.fromName} → You`
                      : `${payment.fromName} → ${payment.toName}`}
                </strong>
                <small>
                  {payment.countryName} · Payment sent · Waiting for receiver
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
                    ? `You → ${transfer.toName}`
                    : transfer.toUserId === session.user.id
                      ? `${transfer.fromName} → You`
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
                <strong>Nothing outstanding</strong>
                <small>Everyone is settled for the selected countries.</small>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="panel people-ledger-panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">TRIP CREW</p>
            <h2>Everyone&apos;s trip money</h2>
          </div>
        </div>

        <div className="people-ledger-grid">
          {summary.people.length ? (
            summary.people.map((person) => (
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
              </article>
            ))
          ) : (
            <p className="muted">No expense activity yet.</p>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">HISTORY</p>
            <h2>Received payments</h2>
          </div>
        </div>

        <div className="settlement-history">
          {summary.settledSettlements.length ? (
            summary.settledSettlements.slice(0, 30).map((payment) => (
              <div className="settlement-history-row" key={payment.id}>
                <span className="settlement-history-check">✓</span>
                <span>
                  <strong>
                    {payment.fromName} → {payment.toName}
                  </strong>
                  <small>
                    {payment.countryName} · Received{" "}
                    {payment.confirmedAt
                      ? payment.confirmedAt.toLocaleDateString("en-MY")
                      : ""}
                  </small>
                </span>
                <strong>{formatMoney(payment.amount, payment.currency)}</strong>
              </div>
            ))
          ) : (
            <p className="muted">No confirmed settlement payments yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
