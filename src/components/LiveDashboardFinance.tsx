"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { FullPageLink as Link } from "@/components/FullPageLink";
import { formatMoney } from "@/lib/money";

type FinanceData = {
  total: number;
  categories: Array<{
    category: string;
    amount: number;
  }>;
  baseCurrency: string;
  myBudget: number;
  myShareSpent: number;
  myRemaining: number;
  combinedBudget: number;
  groupRemaining: number;
  budgetsSubmitted: number;
  travelerCount: number;
};

const categoryIcons: Record<
  string,
  string
> = {
  Food: "🥢",
  Flights: "✈",
  Hotel: "⌂",
  Transport: "↗",
  Attractions: "◎",
  Shopping: "◇",
  Other: "•",
};

function WalletCard({
  label,
  value,
  currency,
  detail,
  tone = "",
}: {
  label: string;
  value: number;
  currency: string;
  detail: string;
  tone?: string;
}) {
  return (
    <article
      className={[
        "stat-card",
        "travel-stat",
        tone,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span
        className="travel-stat-icon"
        aria-hidden="true"
      >
        ◈
      </span>

      <div>
        <span>{label}</span>
        <strong>
          {formatMoney(
            value,
            currency,
          )}
        </strong>
        <small>
          {detail}
        </small>
      </div>
    </article>
  );
}

export function LiveDashboardFinance({
  initialData,
  tripId,
  allTrips = false,
}: {
  initialData: FinanceData;
  tripId: string;
  allTrips?: boolean;
}) {
  const [data, setData] =
    useState(initialData);
  const [syncError, setSyncError] =
    useState(false);

  const endpoint = useMemo(
    () =>
      allTrips
        ? "/api/dashboard/finance?scope=all"
        : `/api/dashboard/finance?trip=${encodeURIComponent(
            tripId,
          )}`,
    [allTrips, tripId],
  );

  const refresh =
    useCallback(async () => {
      if (
        !navigator.onLine ||
        document.visibilityState !==
          "visible"
      ) {
        return;
      }

      try {
        const response =
          await fetch(
            `${endpoint}&t=${Date.now()}`,
            {
              cache: "no-store",
            },
          );

        if (!response.ok) {
          setSyncError(true);
          return;
        }

        setData(
          (await response.json()) as FinanceData,
        );
        setSyncError(false);
      } catch {
        setSyncError(true);
      }
    }, [endpoint]);

  useEffect(() => {
    const timer =
      window.setInterval(
        () => void refresh(),
        8000,
      );

    function refreshVisible() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void refresh();
      }
    }

    window.addEventListener(
      "online",
      refreshVisible,
    );
    window.addEventListener(
      "focus",
      refreshVisible,
    );
    window.addEventListener(
      "mnm:expense-updated",
      refreshVisible,
    );
    window.addEventListener(
      "mnm:budget-updated",
      refreshVisible,
    );
    window.addEventListener(
      "mnm:data-synced",
      refreshVisible,
    );
    document.addEventListener(
      "visibilitychange",
      refreshVisible,
    );

    return () => {
      window.clearInterval(timer);
      window.removeEventListener(
        "online",
        refreshVisible,
      );
      window.removeEventListener(
        "focus",
        refreshVisible,
      );
      window.removeEventListener(
        "mnm:expense-updated",
        refreshVisible,
      );
      window.removeEventListener(
        "mnm:budget-updated",
        refreshVisible,
      );
      window.removeEventListener(
        "mnm:data-synced",
        refreshVisible,
      );
      document.removeEventListener(
        "visibilitychange",
        refreshVisible,
      );
    };
  }, [refresh]);

  return (
    <>
      <div
        className={
          syncError
            ? "settlement-live-sync-state error"
            : "settlement-live-sync-state"
        }
      >
        <i aria-hidden="true" />
        <span>
          {syncError
            ? "Travel wallet sync will retry automatically"
            : allTrips
              ? "All-trip wallet updates automatically"
              : "Trip wallet updates automatically"}
        </span>
      </div>

      <section className="dashboard-budget-section">
        <div className="travel-section-heading compact">
          <div>
            <p className="eyebrow">
              MY TRAVEL WALLET
            </p>
            <h2>
              Personal budget
            </h2>
          </div>

          <Link
            className="panel-link"
            href="/settings/budgets"
          >
            Edit
          </Link>
        </div>

        <div
          className="stat-grid dashboard-stats travel-stat-grid"
          aria-label="Personal trip budget"
        >
          <WalletCard
            label="My budget"
            value={
              data.myBudget
            }
            currency={
              data.baseCurrency
            }
            detail="Your own spending target"
            tone="budget"
          />

          <WalletCard
            label="My share spent"
            value={
              data.myShareSpent
            }
            currency={
              data.baseCurrency
            }
            detail="Your personal share of trip expenses"
            tone="spent"
          />

          <WalletCard
            label="My remaining"
            value={
              data.myRemaining
            }
            currency={
              data.baseCurrency
            }
            detail={
              data.myRemaining < 0
                ? "Over your personal target"
                : "Available in your own wallet"
            }
            tone={
              data.myRemaining < 0
                ? "danger"
                : "success"
            }
          />
        </div>
      </section>

      <section className="dashboard-budget-section">
        <div className="travel-section-heading compact">
          <div>
            <p className="eyebrow">
              GROUP TRIP
            </p>
            <h2>
              Combined travel budget
            </h2>
          </div>

          <span>
            {data.budgetsSubmitted}/
            {data.travelerCount} budgets set
          </span>
        </div>

        <div
          className="stat-grid dashboard-stats travel-stat-grid"
          aria-label="Group trip budget"
        >
          <WalletCard
            label="Combined budget"
            value={
              data.combinedBudget
            }
            currency={
              data.baseCurrency
            }
            detail="Sum of submitted personal budgets"
            tone="budget"
          />

          <WalletCard
            label="Trip expenses"
            value={
              data.total
            }
            currency={
              data.baseCurrency
            }
            detail="Expenses across destinations you can access"
            tone="spent"
          />

          <WalletCard
            label="Group remaining"
            value={
              data.groupRemaining
            }
            currency={
              data.baseCurrency
            }
            detail={
              data.groupRemaining < 0
                ? "Group spending is above combined budgets"
                : "Combined budget less trip expenses"
            }
            tone={
              data.groupRemaining < 0
                ? "danger"
                : "success"
            }
          />
        </div>
      </section>

      <section className="panel dashboard-panel dashboard-live-categories">
        <div className="panel-title">
          <div>
            <p className="eyebrow">
              SPENDING
            </p>
            <h2>
              By category
            </h2>
          </div>

          <Link
            className="panel-link"
            href="/expenses"
          >
            View all
          </Link>
        </div>

        <div className="category-list">
          {data.categories.length ? (
            data.categories.map(
              (item) => {
                const percentage =
                  data.total > 0
                    ? Math.min(
                        100,
                        (
                          item.amount /
                          data.total
                        ) * 100,
                      )
                    : 0;

                return (
                  <div
                    className="category-row"
                    key={
                      item.category
                    }
                  >
                    <span className="category-icon">
                      {
                        categoryIcons[
                          item.category
                        ] ?? "•"
                      }
                    </span>

                    <div className="category-copy">
                      <div>
                        <span>
                          {
                            item.category
                          }
                        </span>
                        <strong>
                          {formatMoney(
                            item.amount,
                            data.baseCurrency,
                          )}
                        </strong>
                      </div>

                      <span className="category-track">
                        <span
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </span>
                    </div>
                  </div>
                );
              },
            )
          ) : (
            <p className="muted">
              No expenses yet.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
