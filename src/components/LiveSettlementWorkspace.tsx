"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  SETTLEMENT_UPDATED_EVENT,
  SettlementActionButton,
} from "@/components/SettlementActionButton";
import { formatMoney } from "@/lib/money";
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
                  {payment.countryName} ·
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
                  {transfer.countryName} ·
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
            Received payments
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
                    {payment.countryName} ·
                    Received{" "}
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
            No confirmed settlement
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
  variant,
}: {
  initialData: SettlementLiveData;
  currentUserId: string;
  countryId?: string;
  tripId?: string;
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

    if (countryId) {
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
  }, [countryId, tripId]);

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
        <PersonalSummary
          data={data}
          currentUserId={
            currentUserId
          }
        />
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
