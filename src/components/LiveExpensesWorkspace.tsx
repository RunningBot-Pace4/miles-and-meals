"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { DeleteExpenseButton } from "@/components/DeleteExpenseButton";
import { FullPageLink as Link } from "@/components/FullPageLink";
import { ReceiptViewerButton } from "@/components/ReceiptViewerButton";
import type { ExpenseLiveData } from "@/lib/expense-live";
import {
  effectiveConvertedAmount,
  formatMoney,
} from "@/lib/money";

export const EXPENSE_UPDATED_EVENT =
  "mnm:expense-updated";

const POLL_INTERVAL_MS = 8000;
const REQUEST_TIMEOUT_MS = 4000;

export function LiveExpensesWorkspace({
  initialData,
  locked = false,
}: {
  initialData: ExpenseLiveData;
  locked?: boolean;
}) {
  const [data, setData] =
    useState(initialData);
  const [syncing, setSyncing] =
    useState(false);
  const [syncError, setSyncError] =
    useState(false);
  const requestInFlight =
    useRef(false);
  const queuedRefresh =
    useRef(false);

  const refresh =
    useCallback(
      async (
        showState = false,
      ) => {
        if (
          !navigator.onLine ||
          document.visibilityState !==
            "visible"
        ) {
          return;
        }

        if (requestInFlight.current) {
          queuedRefresh.current = true;
          return;
        }

        requestInFlight.current = true;

        if (showState) {
          setSyncing(true);
        }

        const controller =
          new AbortController();
        const timer =
          window.setTimeout(
            () =>
              controller.abort(),
            REQUEST_TIMEOUT_MS,
          );

        try {
          const response =
            await fetch(
              `/api/expenses/live?t=${Date.now()}`,
              {
                cache: "no-store",
                signal:
                  controller.signal,
              },
            );

          if (!response.ok) {
            setSyncError(true);
            return;
          }

          const payload =
            (await response.json()) as ExpenseLiveData;

          setData(payload);
          setSyncError(false);
        } catch {
          setSyncError(true);
        } finally {
          window.clearTimeout(
            timer,
          );
          requestInFlight.current =
            false;

          if (showState) {
            setSyncing(false);
          }

          if (
            queuedRefresh.current
          ) {
            queuedRefresh.current =
              false;
            window.setTimeout(
              () =>
                void refresh(false),
              0,
            );
          }
        }
      },
      [],
    );

  useEffect(() => {
    const timer =
      window.setInterval(
        () => void refresh(false),
        POLL_INTERVAL_MS,
      );

    function refreshNow() {
      void refresh(true);
    }

    function refreshVisible() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void refresh(false);
      }
    }

    window.addEventListener(
      EXPENSE_UPDATED_EVENT,
      refreshNow,
    );
    window.addEventListener(
      "online",
      refreshNow,
    );
    window.addEventListener(
      "focus",
      refreshVisible,
    );
    document.addEventListener(
      "visibilitychange",
      refreshVisible,
    );

    return () => {
      window.clearInterval(timer);
      window.removeEventListener(
        EXPENSE_UPDATED_EVENT,
        refreshNow,
      );
      window.removeEventListener(
        "online",
        refreshNow,
      );
      window.removeEventListener(
        "focus",
        refreshVisible,
      );
      document.removeEventListener(
        "visibilitychange",
        refreshVisible,
      );
    };
  }, [refresh]);

  return (
    <div className="stack gap-lg">
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
            ? "Updating expenses…"
            : syncError
              ? "Expense sync will retry automatically"
              : "Expenses update automatically"}
        </span>
      </div>

      <section className="expense-overview-grid">
        <article className="expense-overview-card">
          <span>
            Trip expenses
          </span>
          <strong>
            {formatMoney(
              data.total,
              data.baseCurrency,
            )}
          </strong>
          <small>
            Across countries you can access
          </small>
        </article>

        <article className="expense-overview-card personal">
          <span>
            Your personal share
          </span>
          <strong>
            {formatMoney(
              data.myShare,
              data.baseCurrency,
            )}
          </strong>
          <small>
            Your included share of these expenses
          </small>
        </article>

        <Link
          className="expense-overview-card settle-link"
          href="/settlements"
        >
          <span>Settle Up</span>
          <strong>
            Paid · Waiting · Received
          </strong>
          <small>
            Track repayments without typing amounts
          </small>
        </Link>
      </section>

      <section className="card-list">
        {data.rows.length ? (
          data.rows.map(
            (expense) => {
              const displayAmount =
                effectiveConvertedAmount(
                  expense.convertedAmount,
                  expense.actualConvertedAmount,
                );

              return (
                <article
                  className="expense-card"
                  key={expense.id}
                >
                  <div className="expense-main">
                    <div>
                      <p className="eyebrow">
                        {expense.tripName} ·{" "}
                        {expense.countryName} ·{" "}
                        {expense.category}
                      </p>
                      <h2>
                        {
                          expense.description
                        }
                      </h2>
                      <p className="muted">
                        {
                          expense.expenseDate
                        }{" "}
                        · Paid by{" "}
                        {
                          expense.paidByName
                        }
                      </p>
                    </div>

                    <strong>
                      {formatMoney(
                        displayAmount,
                        expense.baseCurrency,
                      )}
                    </strong>
                  </div>

                  <div className="expense-meta">
                    <span>
                      {
                        expense.transactionCurrency
                      }{" "}
                      {
                        expense.transactionAmount
                      }
                    </span>
                    <span>
                      FX{" "}
                      {
                        expense.exchangeRate
                      }
                    </span>
                    {expense.actualConvertedAmount ? (
                      <span className="badge">
                        Actual charge
                      </span>
                    ) : null}
                  </div>

                  <div className="expense-share-summary">
                    <span>
                      Personal shares
                    </span>
                    <div>
                      {expense.splits.map(
                        (split) => (
                          <span
                            className="expense-share-chip"
                            key={
                              split.userId
                            }
                          >
                            {
                              split.name
                            }{" "}
                            ·{" "}
                            {formatMoney(
                              split.share,
                              expense.baseCurrency,
                            )}
                          </span>
                        ),
                      )}
                    </div>
                  </div>

                  <div className="card-actions">
                    {!locked ? (
                      <Link
                        href={`/expenses/${expense.id}/edit`}
                      >
                        Edit
                      </Link>
                    ) : (
                      <span className="muted">Locked for settlement</span>
                    )}

                    {expense.hasReceipt ? (
                      <ReceiptViewerButton
                        expenseId={
                          expense.id
                        }
                      />
                    ) : null}

                    {!locked ? (
                      <DeleteExpenseButton
                        id={expense.id}
                        quiet
                      />
                    ) : null}
                  </div>
                </article>
              );
            },
          )
        ) : (
          <article className="empty-card">
            <h2>
              No expenses yet
            </h2>
            <p>
              Add your first cash, card or e-wallet expense.
            </p>
          </article>
        )}
      </section>
    </div>
  );
}
