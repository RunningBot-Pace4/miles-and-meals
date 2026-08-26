"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FullPageLink as Link } from "@/components/FullPageLink";
import {
  SETTLEMENT_UPDATED_EVENT,
  SettlementActionButton,
} from "@/components/SettlementActionButton";
import { formatMoney } from "@/lib/money";
import { SettlementPaymentTools } from "@/components/SettlementPaymentTools";
import { trackProductEvent } from "@/lib/product-analytics-client";
import type { SettlementLiveData } from "@/lib/settlement-live";

const POLL_INTERVAL_MS = 4000;
const REQUEST_TIMEOUT_MS = 3500;

type WorkspaceVariant =
  | "dashboard"
  | "settlements";

function balanceStatus(
  value: number,
  currency: string,
): {
  label: string;
  className: string;
} {
  if (Math.abs(value) < 0.005) {
    return {
      label: "Balanced",
      className: "balanced",
    };
  }

  if (value > 0) {
    return {
      label: `Net receive ${formatMoney(
        value,
        currency,
      )}`,
      className: "receive",
    };
  }

  return {
    label: `Net pay ${formatMoney(
      Math.abs(value),
      currency,
    )}`,
    className: "pay",
  };
}


function netPositionLabel(value: number, currency: string): string {
  if (Math.abs(value) < 0.005) {
    return "Balanced";
  }

  return value > 0
    ? `Receive ${formatMoney(value, currency)}`
    : `Pay ${formatMoney(Math.abs(value), currency)}`;
}

function formatSettlementDate(value: string): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function SmartSettlementPanel({
  data,
  currentUserId,
}: {
  data: SettlementLiveData;
  currentUserId: string;
}) {
  const [activeView, setActiveView] = useState<
    "SMART" | "ORIGINAL" | "HISTORY"
  >("SMART");
  const plans = data.smartPlans.filter(
    (plan) =>
      plan.optimizedTransferCount > 0 ||
      plan.originalExpenseBalances.length > 0 ||
      plan.recordedPayments.length > 0,
  );

  const hasSmartRecommendation = plans.some(
    (plan) => plan.optimizedTransferCount > 0,
  );

  useEffect(() => {
    if (hasSmartRecommendation) {
      trackProductEvent("smart_settlement_viewed", "/settlements");
    }
  }, [hasSmartRecommendation]);

  if (plans.length === 0) {
    return null;
  }

  const originalCount = plans.reduce(
    (sum, plan) => sum + plan.originalTransferCount,
    0,
  );
  const optimizedCount = plans.reduce(
    (sum, plan) => sum + plan.optimizedTransferCount,
    0,
  );
  const saved = Math.max(0, originalCount - optimizedCount);
  const allOptimized = plans.flatMap((plan) => plan.optimizedTransfers);
  const exactPlan = plans.every((plan) => plan.optimizationMode === "EXACT");
  const myTransfers = allOptimized.filter(
    (transfer) =>
      transfer.fromUserId === currentUserId ||
      transfer.toUserId === currentUserId,
  );
  const originalBalances = plans.flatMap((plan) =>
    plan.originalExpenseBalances.map((balance) => ({ plan, balance })),
  );
  const recordedPayments = plans
    .flatMap((plan) =>
      plan.recordedPayments.map((payment) => ({ plan, payment })),
    )
    .sort(
      (left, right) =>
        new Date(right.payment.sentAt).getTime() -
        new Date(left.payment.sentAt).getTime(),
    );

  function transferDetails(
    transfer: (typeof allOptimized)[number],
    index: number,
    scope: "mine" | "all",
  ) {
    const plan = plans.find((row) => row.countryId === transfer.countryId);

    if (!plan) {
      return null;
    }

    const payer = plan.netPositions.find(
      (position) => position.userId === transfer.fromUserId,
    );
    const receiver = plan.netPositions.find(
      (position) => position.userId === transfer.toUserId,
    );
    const pairBalances = plan.originalExpenseBalances.filter(
      (balance) =>
        (balance.fromUserId === transfer.fromUserId &&
          balance.toUserId === transfer.toUserId) ||
        (balance.fromUserId === transfer.toUserId &&
          balance.toUserId === transfer.fromUserId),
    );
    const relatedExpenseLines = plan.originalExpenseBalances
      .filter(
        (balance) =>
          balance.fromUserId === transfer.fromUserId ||
          balance.toUserId === transfer.fromUserId ||
          balance.fromUserId === transfer.toUserId ||
          balance.toUserId === transfer.toUserId,
      )
      .flatMap((balance) => balance.expenses)
      .filter(
        (expense, expenseIndex, rows) =>
          rows.findIndex(
            (candidate) =>
              candidate.expenseId === expense.expenseId &&
              candidate.participantUserId === expense.participantUserId,
          ) === expenseIndex,
      )
      .sort((left, right) => right.expenseDate.localeCompare(left.expenseDate));

    return (
      <details
        className="smart-transfer-details"
        key={`${scope}-detail-${transfer.countryId}-${transfer.fromUserId}-${transfer.toUserId}-${index}`}
      >
        <summary>View details</summary>
        <div className="smart-transfer-details-body">
          <div className="smart-transfer-detail-heading">
            <span>See how this was calculated</span>
            <strong>
              {transfer.fromName} pays {transfer.toName} {formatMoney(transfer.amount, transfer.currency)}
            </strong>
            <small>
              This recommendation allocates the payer&apos;s remaining net payable to the receiver&apos;s
              remaining net receivable. Whole-group netting can combine several original expenses.
            </small>
          </div>

          <div className="smart-transfer-net-grid">
            {[payer, receiver].filter(Boolean).map((position) => {
              if (!position) {
                return null;
              }

              return (
                <article key={position.userId}>
                  <div className="smart-transfer-net-head">
                    <strong>{position.name}</strong>
                    <span className={position.remainingNet >= 0 ? "receive" : "pay"}>
                      {netPositionLabel(position.remainingNet, plan.currency)}
                    </span>
                  </div>
                  <dl>
                    <div>
                      <dt>Original shares owed</dt>
                      <dd>− {formatMoney(position.grossOwes, plan.currency)}</dd>
                    </div>
                    <div>
                      <dt>Others&apos; shares on expenses paid</dt>
                      <dd>+ {formatMoney(position.grossReceives, plan.currency)}</dd>
                    </div>
                    <div>
                      <dt>Payments already sent</dt>
                      <dd>+ {formatMoney(position.recordedSent, plan.currency)}</dd>
                    </div>
                    <div>
                      <dt>Payments already received</dt>
                      <dd>− {formatMoney(position.recordedReceived, plan.currency)}</dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>

          {pairBalances.length > 0 ? (
            <div className="smart-transfer-pair-proof">
              <strong>Original balances between these two travelers</strong>
              {pairBalances.map((balance) => (
                <span key={`${balance.fromUserId}-${balance.toUserId}`}>
                  {balance.fromName} → {balance.toName} · {formatMoney(balance.amount, plan.currency)} · {balance.expenseCount} expense{balance.expenseCount === 1 ? "" : "s"}
                </span>
              ))}
            </div>
          ) : (
            <p className="smart-transfer-no-direct-balance">
              There is no single direct expense balance between these two travelers. This transfer exists because the group&apos;s net positions are being simplified.
            </p>
          )}

          {relatedExpenseLines.length > 0 ? (
            <div className="smart-transfer-expense-proof">
              <div>
                <strong>Expenses behind these net positions</strong>
                <small>Expense shares are shown in the trip&apos;s base currency.</small>
              </div>
              <div className="smart-proof-list">
                {relatedExpenseLines.map((expense) => (
                  <div
                    className="smart-proof-row"
                    key={`${expense.expenseId}-${expense.participantUserId}`}
                  >
                    <span>
                      <strong>{expense.description}</strong>
                      <small>
                        {formatSettlementDate(expense.expenseDate)} · {expense.category} · {expense.participantName}&apos;s share · paid by {expense.payerName}
                      </small>
                    </span>
                    <span className="smart-proof-amount">
                      <strong>{formatMoney(expense.shareAmount, expense.currency)}</strong>
                      <small>of {formatMoney(expense.expenseTotal, expense.currency)}</small>
                    </span>
                    <Link className="smart-proof-link" href={`/expenses/${expense.expenseId}/edit`}>
                      View expense
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </details>
    );
  }

  function transferCard(
    transfer: (typeof allOptimized)[number],
    index: number,
    scope: "mine" | "all",
  ) {
    const isMine = scope === "mine";

    return (
      <article
        className={[
          "smart-transfer-card",
          isMine && transfer.fromUserId === currentUserId ? "pay" : "",
          isMine && transfer.toUserId === currentUserId ? "receive" : "",
          "with-details",
        ]
          .filter(Boolean)
          .join(" ")}
        key={`${scope}-${transfer.countryId}-${transfer.fromUserId}-${transfer.toUserId}-${index}`}
      >
        <div className="smart-transfer-card-main">
          {isMine ? (
            <div className="smart-transfer-route">
              <span className="avatar mini">
                {transfer.fromUserId === currentUserId
                  ? "Y"
                  : transfer.fromName.trim().charAt(0).toUpperCase()}
              </span>
              <span>
                <strong>
                  {transfer.fromUserId === currentUserId ? "You" : transfer.fromName}
                </strong>
                <small>pays</small>
              </span>
              <b aria-hidden="true">→</b>
              <span className="avatar mini">
                {transfer.toUserId === currentUserId
                  ? "Y"
                  : transfer.toName.trim().charAt(0).toUpperCase()}
              </span>
              <span>
                <strong>
                  {transfer.toUserId === currentUserId ? "You" : transfer.toName}
                </strong>
                <small>{transfer.tripName}</small>
              </span>
            </div>
          ) : (
            <div className="smart-transfer-copy">
              <strong>
                {transfer.fromName} <span aria-hidden="true">→</span> {transfer.toName}
              </strong>
              <small>{transfer.tripName} · Suggested only</small>
            </div>
          )}
          <strong className="smart-transfer-amount">
            {formatMoney(transfer.amount, transfer.currency)}
          </strong>
        </div>
        {isMine ? (
          <SettlementPaymentTools
            tripName={transfer.tripName}
            fromName={transfer.fromName}
            toName={transfer.toName}
            amount={transfer.amount}
            currency={transfer.currency}
            currentUserId={currentUserId}
            fromUserId={transfer.fromUserId}
            toUserId={transfer.toUserId}
          />
        ) : null}
        {transferDetails(transfer, index, scope)}
      </article>
    );
  }

  return (
    <section
      className="panel smart-settlement-panel"
      aria-labelledby="smart-settlement-title"
      aria-live="polite"
    >
      <div className="smart-settlement-hero">
        <div>
          <p className="eyebrow">SMART SETTLEMENT</p>
          <h2 id="smart-settlement-title">Settle with fewer transfers.</h2>
          <p>
            Miles &amp; Meals keeps the original expense trail intact, then nets the remaining balances into {exactPlan
              ? "a minimum-transfer plan"
              : "a simplified plan for this larger group"}. This remains a read-only recommendation. Open any transfer to see exactly how the underlying balances were formed.
          </p>
        </div>
        <span className="smart-settlement-badge" aria-label={`${saved} transfers avoided`}>
          ✦ {exactPlan
            ? saved > 0
              ? `${saved} avoided · minimum plan`
              : "Minimum plan"
            : saved > 0
              ? `${saved} avoided`
              : "Simplified plan"}
        </span>
      </div>

      <div className="smart-settlement-tabs" role="tablist" aria-label="Settlement audit views">
        <button
          aria-selected={activeView === "SMART"}
          className={activeView === "SMART" ? "active" : ""}
          onClick={() => setActiveView("SMART")}
          role="tab"
          type="button"
        >
          Smart Settlement
          <small>{optimizedCount} recommended</small>
        </button>
        <button
          aria-selected={activeView === "ORIGINAL"}
          className={activeView === "ORIGINAL" ? "active" : ""}
          onClick={() => setActiveView("ORIGINAL")}
          role="tab"
          type="button"
        >
          Original Balances
          <small>{originalBalances.length} relationships</small>
        </button>
        <button
          aria-selected={activeView === "HISTORY"}
          className={activeView === "HISTORY" ? "active" : ""}
          onClick={() => setActiveView("HISTORY")}
          role="tab"
          type="button"
        >
          History
          <small>{recordedPayments.length} payments</small>
        </button>
      </div>

      {activeView === "SMART" ? (
        <div role="tabpanel" className="smart-settlement-tab-panel">
          <div className="smart-settlement-metrics" aria-label="Settlement optimization summary">
            <div>
              <span>Outstanding directions</span>
              <strong>{originalCount}</strong>
            </div>
            <span className="smart-settlement-arrow" aria-hidden="true">→</span>
            <div className="recommended">
              <span>Recommended transfers</span>
              <strong>{optimizedCount}</strong>
            </div>
            <div>
              <span>Transfers avoided</span>
              <strong>{saved}</strong>
            </div>
          </div>

          {myTransfers.length > 0 ? (
            <div className="smart-settlement-your-move">
              <div className="smart-settlement-section-title">
                <span className="smart-settlement-spark" aria-hidden="true">✦</span>
                <div>
                  <strong>Your recommended moves</strong>
                  <small>Open View details if you want to audit the amount</small>
                </div>
              </div>
              <div className="smart-settlement-transfer-list">
                {myTransfers.map((transfer, index) => transferCard(transfer, index, "mine"))}
              </div>
            </div>
          ) : null}

          <div className="smart-settlement-all-moves">
            <div className="smart-settlement-section-title">
              <span className="smart-settlement-spark" aria-hidden="true">◎</span>
              <div>
                <strong>Recommended group plan</strong>
                <small>{optimizedCount} transfer{optimizedCount === 1 ? "" : "s"} clears the remaining balances</small>
              </div>
            </div>

            <div className="smart-settlement-transfer-list">
              {allOptimized.length > 0 ? (
                allOptimized.map((transfer, index) => transferCard(transfer, index, "all"))
              ) : (
                <div className="settled-state compact">
                  <span aria-hidden="true">✓</span>
                  <div>
                    <strong>No recommended transfers</strong>
                    <small>The remaining net balances are already clear.</small>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="smart-settlement-audit-note">
            <span aria-hidden="true">ⓘ</span>
            <p>
              <strong>Nothing is rewritten.</strong> Smart Settlement only recommends the shortest practical payment plan. Original expense shares and recorded payments remain available in the audit tabs above.
            </p>
          </div>
        </div>
      ) : null}

      {activeView === "ORIGINAL" ? (
        <div className="smart-settlement-tab-panel smart-original-balances-panel" role="tabpanel">
          <div className="smart-audit-heading">
            <div>
              <strong>Who originally owes whom</strong>
              <small>Before whole-group netting. Expand a relationship to see every contributing expense.</small>
            </div>
            <span>{originalBalances.length} relationship{originalBalances.length === 1 ? "" : "s"}</span>
          </div>

          <div className="smart-original-balance-list">
            {originalBalances.length ? (
              originalBalances.map(({ plan, balance }) => (
                <details
                  className="smart-original-balance-card"
                  key={`${plan.countryId}-${balance.fromUserId}-${balance.toUserId}`}
                >
                  <summary>
                    <span>
                      <strong>{balance.fromName} → {balance.toName}</strong>
                      <small>{plan.tripName} · {balance.expenseCount} contributing expense{balance.expenseCount === 1 ? "" : "s"}</small>
                    </span>
                    <strong>{formatMoney(balance.amount, plan.currency)}</strong>
                  </summary>
                  <div className="smart-original-expenses">
                    {balance.expenses.map((expense) => (
                      <div
                        className="smart-original-expense-row"
                        key={`${expense.expenseId}-${expense.participantUserId}`}
                      >
                        <span>
                          <strong>{expense.description}</strong>
                          <small>
                            {formatSettlementDate(expense.expenseDate)} · {expense.category} · {expense.participantName}&apos;s share · paid by {expense.payerName}
                          </small>
                        </span>
                        <span className="smart-proof-amount">
                          <strong>{formatMoney(expense.shareAmount, expense.currency)}</strong>
                          <small>Expense total {formatMoney(expense.expenseTotal, expense.currency)}</small>
                        </span>
                        <Link className="smart-proof-link" href={`/expenses/${expense.expenseId}/edit`}>
                          View expense
                        </Link>
                      </div>
                    ))}
                  </div>
                </details>
              ))
            ) : (
              <p className="muted">No original expense obligations for this trip.</p>
            )}
          </div>

          <p className="smart-settlement-note smart-audit-footnote">
            These are original expense-share relationships. Payments may later be routed differently by Smart Settlement, so payment activity is shown separately instead of being forced back onto a receipt that it may not directly represent.
          </p>
        </div>
      ) : null}

      {activeView === "HISTORY" ? (
        <div className="smart-settlement-tab-panel smart-payment-audit-panel" role="tabpanel">
          <div className="smart-audit-heading">
            <div>
              <strong>Payments already recorded</strong>
              <small>Both sent payments and receiver-confirmed payments are deducted before Smart Settlement recalculates.</small>
            </div>
            <span>{recordedPayments.length} payment{recordedPayments.length === 1 ? "" : "s"}</span>
          </div>

          <div className="smart-payment-audit-list">
            {recordedPayments.length ? (
              recordedPayments.map(({ plan, payment }) => (
                <article className="smart-payment-audit-row" key={payment.id}>
                  <span className={payment.status === "SETTLED" ? "settled" : "sent"} aria-hidden="true">
                    {payment.status === "SETTLED" ? "✓" : "↗"}
                  </span>
                  <span>
                    <strong>{payment.fromName} → {payment.toName}</strong>
                    <small>
                      {plan.tripName} · {payment.status === "SETTLED" ? "Confirmed received" : "Payment sent · awaiting receiver"} · {formatSettlementDate(payment.sentAt)}
                    </small>
                  </span>
                  <strong>{formatMoney(payment.amount, payment.currency)}</strong>
                </article>
              ))
            ) : (
              <p className="muted">No settlement payments have been recorded yet.</p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PersonCards({
  data,
  currentUserId,
}: {
  data: SettlementLiveData;
  currentUserId: string;
}) {
  return (
    <section className="panel people-ledger-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">
            TRIP CREW
          </p>
          <h2>
            Everyone&apos;s trip money
          </h2>
        </div>
      </div>

      <div className="people-ledger-grid">
        {data.people.length ? (
          data.people.map((person) => {
            const status =
              balanceStatus(
                person.confirmedBalance,
                data.baseCurrency,
              );

            return (
              <article
                className={
                  person.userId ===
                  currentUserId
                    ? "person-ledger-card current-person"
                    : "person-ledger-card"
                }
                key={person.userId}
              >
                <div className="person-ledger-head">
                  <span className="avatar">
                    {person.name
                      .trim()
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                  <div>
                    <strong>
                      {person.name}
                    </strong>
                    <small>
                      {person.userId ===
                      currentUserId
                        ? "You"
                        : "Traveler"}
                    </small>
                  </div>
                </div>

                <div className="person-ledger-metrics">
                  <div>
                    <span>
                      Expense paid
                    </span>
                    <strong>
                      {formatMoney(
                        person.paid,
                        data.baseCurrency,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Personal share
                    </span>
                    <strong>
                      {formatMoney(
                        person.share,
                        data.baseCurrency,
                      )}
                    </strong>
                  </div>

                  <div className="metric-receive">
                    <span>Received</span>
                    <strong>
                      {formatMoney(
                        person.settledReceived,
                        data.baseCurrency,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Settlement paid
                    </span>
                    <strong>
                      {formatMoney(
                        person.settledPaid,
                        data.baseCurrency,
                      )}
                    </strong>
                  </div>

                  <div className="metric-receive">
                    <span>
                      Still receive
                    </span>
                    <strong>
                      {formatMoney(
                        person.toReceive,
                        data.baseCurrency,
                      )}
                    </strong>
                  </div>

                  <div className="metric-pay">
                    <span>Still pay</span>
                    <strong>
                      {formatMoney(
                        person.toPay,
                        data.baseCurrency,
                      )}
                    </strong>
                  </div>

                  <div
                    className={[
                      "person-ledger-balance",
                      status.className,
                    ].join(" ")}
                  >
                    <span>
                      Confirmed balance
                    </span>
                    <strong>
                      {status.label}
                    </strong>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <p className="muted">
            No expense activity yet.
          </p>
        )}
      </div>
    </section>
  );
}

function SettlementStatus({
  data,
  currentUserId,
}: {
  data: SettlementLiveData;
  currentUserId: string;
}) {
  return (
    <section className="panel settlement-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">
            CURRENT STATUS
          </p>
          <h2>
            Waiting &amp; payment sent
          </h2>
        </div>
      </div>

      <div className="settlement-status-list">
        {data.pendingSettlements.map(
          (payment) => (
            <article
              className="settlement-status-row sent"
              key={payment.id}
            >
              <div className="settlement-status-icon">
                ↗
              </div>

              <div className="settlement-status-copy">
                <strong>
                  {payment.fromUserId ===
                  currentUserId
                    ? `You → ${payment.toName}`
                    : payment.toUserId ===
                        currentUserId
                      ? `${payment.fromName} → You`
                      : `${payment.fromName} → ${payment.toName}`}
                </strong>
                <small>
                  {payment.tripName} ·
                  Payment sent · Waiting
                  for receiver
                </small>
              </div>

              <strong className="settlement-amount">
                {formatMoney(
                  payment.amount,
                  payment.currency,
                )}
              </strong>

              {payment.toUserId ===
              currentUserId ? (
                <SettlementActionButton
                  action="MARK_RECEIVED"
                  countryId={
                    payment.countryId
                  }
                  counterpartyUserId={
                    payment.fromUserId
                  }
                  label="Confirm received"
                />
              ) : null}
            </article>
          ),
        )}

        {data.waitingTransfers.map(
          (transfer, index) => (
            <article
              className="settlement-status-row waiting"
              key={`${transfer.countryId}-${transfer.fromUserId}-${transfer.toUserId}-${index}`}
            >
              <div className="settlement-status-icon">
                ○
              </div>

              <div className="settlement-status-copy">
                <strong>
                  {transfer.fromUserId ===
                  currentUserId
                    ? `You → ${transfer.toName}`
                    : transfer.toUserId ===
                        currentUserId
                      ? `${transfer.fromName} → You`
                      : `${transfer.fromName} → ${transfer.toName}`}
                </strong>
                <small>
                  {transfer.tripName} ·
                  Waiting for payment
                </small>
              </div>

              <strong className="settlement-amount">
                {formatMoney(
                  transfer.amount,
                  transfer.currency,
                )}
              </strong>

              {transfer.fromUserId ===
              currentUserId ? (
                <SettlementActionButton
                  action="MARK_PAID"
                  countryId={
                    transfer.countryId
                  }
                  counterpartyUserId={
                    transfer.toUserId
                  }
                  label="Mark paid"
                  maximumAmount={transfer.amount}
                  currency={transfer.currency}
                />
              ) : transfer.toUserId ===
                currentUserId ? (
                <SettlementActionButton
                  action="MARK_RECEIVED"
                  countryId={
                    transfer.countryId
                  }
                  counterpartyUserId={
                    transfer.fromUserId
                  }
                  label="Mark received"
                  maximumAmount={transfer.amount}
                  currency={transfer.currency}
                />
              ) : null}
            </article>
          ),
        )}

        {!data.pendingSettlements.length &&
        !data.waitingTransfers.length ? (
          <div className="settled-state">
            <span aria-hidden="true">
              ✓
            </span>
            <div>
              <strong>
                Nothing outstanding
              </strong>
              <small>
                Everyone is settled for
                the selected trip.
              </small>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function PersonalSummary({
  data,
  currentUserId,
}: {
  data: SettlementLiveData;
  currentUserId: string;
}) {
  const me = data.people.find(
    (person) =>
      person.userId ===
      currentUserId,
  );

  if (!me) {
    return null;
  }

  const status = balanceStatus(
    me.confirmedBalance,
    data.baseCurrency,
  );

  return (
    <>
      <section className="settle-summary-grid">
        <article className="settle-summary-card">
          <span>Expense paid</span>
          <strong>
            {formatMoney(
              me.paid,
              data.baseCurrency,
            )}
          </strong>
          <small>
            Expenses you paid upfront
          </small>
        </article>

        <article className="settle-summary-card receive">
          <span>Total received</span>
          <strong>
            {formatMoney(
              me.settledReceived,
              data.baseCurrency,
            )}
          </strong>
          <small>
            {me.awaitingConfirmation > 0
              ? `${formatMoney(
                  me.awaitingConfirmation,
                  data.baseCurrency,
                )} waiting for confirmation`
              : "Confirmed settlement money received"}
          </small>
        </article>

        <article className="settle-summary-card">
          <span>Settlement paid</span>
          <strong>
            {formatMoney(
              me.settledPaid,
              data.baseCurrency,
            )}
          </strong>
          <small>
            {me.paymentSent > 0
              ? `${formatMoney(
                  me.paymentSent,
                  data.baseCurrency,
                )} sent and waiting for receiver`
              : "Confirmed money paid back to others"}
          </small>
        </article>

        <article className="settle-summary-card">
          <span>Your personal share</span>
          <strong>
            {formatMoney(
              me.share,
              data.baseCurrency,
            )}
          </strong>
          <small>
            What you should finally bear
          </small>
        </article>

        <article className="settle-summary-card receive">
          <span>Still to receive</span>
          <strong>
            {formatMoney(
              me.toReceive,
              data.baseCurrency,
            )}
          </strong>
          <small>
            Current outstanding incoming
            money
          </small>
        </article>

        <article className="settle-summary-card pay">
          <span>Still to pay</span>
          <strong>
            {formatMoney(
              me.toPay,
              data.baseCurrency,
            )}
          </strong>
          <small>
            Current outstanding payments
          </small>
        </article>
      </section>

      <section className="settlement-ledger-check">
        <strong>
          Balance check · {status.label}
        </strong>
        <small>
          Expense paid + confirmed
          settlement paid − total received
          − personal share = confirmed
          balance.
        </small>
      </section>
    </>
  );
}

function SettlementHistory({
  data,
}: {
  data: SettlementLiveData;
}) {
  return (
    <section className="panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">
            HISTORY
          </p>
          <h2>
            Completed payments
          </h2>
        </div>
      </div>

      <div className="settlement-history">
        {data.settledSettlements.length ? (
          data.settledSettlements
            .slice(0, 30)
            .map((payment) => (
              <div
                className="settlement-history-row"
                key={payment.id}
              >
                <span className="settlement-history-check">
                  ✓
                </span>
                <span>
                  <strong>
                    {payment.fromName} →{" "}
                    {payment.toName}
                  </strong>
                  <small>
                    {payment.tripName} ·
                    Completed · View only ·{" "}
                    {payment.confirmedAt
                      ? new Date(
                          payment.confirmedAt,
                        ).toLocaleDateString(
                          "en-MY",
                        )
                      : ""}
                  </small>
                </span>
                <strong>
                  {formatMoney(
                    payment.amount,
                    payment.currency,
                  )}
                </strong>
              </div>
            ))
        ) : (
          <p className="muted">
            No completed settlement
            payments yet.
          </p>
        )}
      </div>
    </section>
  );
}

export function LiveSettlementWorkspace({
  initialData,
  currentUserId,
  countryId = "",
  tripId = "",
  allTrips = false,
  variant,
}: {
  initialData: SettlementLiveData;
  currentUserId: string;
  countryId?: string;
  tripId?: string;
  allTrips?: boolean;
  variant: WorkspaceVariant;
}) {
  const [data, setData] =
    useState(initialData);
  const [syncing, setSyncing] =
    useState(false);
  const [syncError, setSyncError] =
    useState(false);
  const requestInFlightRef =
    useRef(false);
  const queuedRefreshRef =
    useRef(false);

  const endpoint = useMemo(() => {
    const query = new URLSearchParams();

    if (allTrips) {
      query.set("scope", "all");
    } else if (countryId) {
      query.set(
        "country",
        countryId,
      );
    } else if (tripId) {
      query.set(
        "trip",
        tripId,
      );
    }

    const suffix = query.toString();

    return suffix
      ? `/api/settlements/summary?${suffix}`
      : "/api/settlements/summary";
  }, [allTrips, countryId, tripId]);

  const refresh = useCallback(
    async (
      showSyncState = false,
    ) => {
      if (
        !navigator.onLine ||
        document.visibilityState !==
          "visible"
      ) {
        return;
      }

      if (requestInFlightRef.current) {
        queuedRefreshRef.current = true;
        return;
      }

      requestInFlightRef.current =
        true;

      if (showSyncState) {
        setSyncing(true);
      }

      const controller =
        new AbortController();
      const timer = window.setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT_MS,
      );

      try {
        const response = await fetch(
          `${endpoint}${
            endpoint.includes("?")
              ? "&"
              : "?"
          }t=${Date.now()}`,
          {
            method: "GET",
            cache: "no-store",
            credentials:
              "same-origin",
            headers: {
              accept:
                "application/json",
            },
            signal:
              controller.signal,
          },
        );

        if (!response.ok) {
          setSyncError(true);
          return;
        }

        const next =
          (await response.json()) as SettlementLiveData;

        setData(next);
        setSyncError(false);
      } catch {
        setSyncError(true);
      } finally {
        window.clearTimeout(timer);
        requestInFlightRef.current =
          false;

        if (showSyncState) {
          setSyncing(false);
        }

        if (queuedRefreshRef.current) {
          queuedRefreshRef.current = false;
          window.setTimeout(
            () => void refresh(false),
            0,
          );
        }
      }
    },
    [endpoint],
  );

  useEffect(() => {
    const timer = window.setInterval(
      () => void refresh(false),
      POLL_INTERVAL_MS,
    );

    function refreshImmediately() {
      void refresh(true);
    }

    function refreshWhenVisible() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void refresh(false);
      }
    }

    window.addEventListener(
      SETTLEMENT_UPDATED_EVENT,
      refreshImmediately,
    );
    window.addEventListener(
      "online",
      refreshImmediately,
    );
    window.addEventListener(
      "mnm:data-synced",
      refreshWhenVisible,
    );
    window.addEventListener(
      "focus",
      refreshWhenVisible,
    );
    document.addEventListener(
      "visibilitychange",
      refreshWhenVisible,
    );

    return () => {
      window.clearInterval(timer);
      window.removeEventListener(
        SETTLEMENT_UPDATED_EVENT,
        refreshImmediately,
      );
      window.removeEventListener(
        "online",
        refreshImmediately,
      );
      window.removeEventListener(
        "mnm:data-synced",
        refreshWhenVisible,
      );
      window.removeEventListener(
        "focus",
        refreshWhenVisible,
      );
      document.removeEventListener(
        "visibilitychange",
        refreshWhenVisible,
      );
    };
  }, [refresh]);

  return (
    <div className="stack gap-lg live-settlement-workspace">
      <div
        className={[
          "settlement-live-sync-state",
          syncError ? "error" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-live="polite"
      >
        <i aria-hidden="true" />
        <span>
          {syncing
            ? "Updating trip money…"
            : syncError
              ? "Live sync will retry automatically"
              : "Trip money updates automatically"}
        </span>
      </div>

      {variant ===
      "settlements" ? (
        <>
          <PersonalSummary
            data={data}
            currentUserId={currentUserId}
          />
          <SmartSettlementPanel
            data={data}
            currentUserId={currentUserId}
          />
        </>
      ) : null}

      <PersonCards
        data={data}
        currentUserId={currentUserId}
      />

      <SettlementStatus
        data={data}
        currentUserId={currentUserId}
      />

      {variant ===
      "settlements" ? (
        <SettlementHistory
          data={data}
        />
      ) : null}
    </div>
  );
}
