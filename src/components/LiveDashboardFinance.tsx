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
  budget: number;
  remaining: number;
  baseCurrency: string;
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

export function LiveDashboardFinance({
  initialData,
  countryId,
}: {
  initialData: FinanceData;
  countryId: string;
}) {
  const [data, setData] =
    useState(initialData);
  const [syncError, setSyncError] =
    useState(false);

  const endpoint = useMemo(() => {
    const params =
      new URLSearchParams();

    if (countryId) {
      params.set(
        "country",
        countryId,
      );
    }

    const query =
      params.toString();

    return query
      ? `/api/dashboard/finance?${query}`
      : "/api/dashboard/finance";
  }, [countryId]);

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
        const response = await fetch(
          `${endpoint}${
            endpoint.includes("?")
              ? "&"
              : "?"
          }t=${Date.now()}`,
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
    const timer = window.setInterval(
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
            ? "Trip spending sync will retry automatically"
            : "Trip spending updates automatically"}
        </span>
      </div>

      <section
        className="stat-grid dashboard-stats travel-stat-grid"
        aria-label="Trip wallet summary"
      >
        <article className="stat-card travel-stat spent">
          <span
            className="travel-stat-icon"
            aria-hidden="true"
          >
            ↗
          </span>
          <div>
            <span>Spent</span>
            <strong>
              {formatMoney(
                data.total,
                data.baseCurrency,
              )}
            </strong>
            <small>
              What the trip has used
            </small>
          </div>
        </article>

        <article className="stat-card travel-stat budget">
          <span
            className="travel-stat-icon"
            aria-hidden="true"
          >
            ◫
          </span>
          <div>
            <span>Budget</span>
            <strong>
              {formatMoney(
                data.budget,
                data.baseCurrency,
              )}
            </strong>
            <small>
              Your travel wallet
            </small>
          </div>
        </article>

        <article
          className={
            data.remaining < 0
              ? "stat-card travel-stat remaining danger"
              : "stat-card travel-stat remaining success"
          }
        >
          <span
            className="travel-stat-icon"
            aria-hidden="true"
          >
            ✦
          </span>
          <div>
            <span>Remaining</span>
            <strong>
              {formatMoney(
                data.remaining,
                data.baseCurrency,
              )}
            </strong>
            <small>
              {data.remaining < 0
                ? "Over planned budget"
                : "Ready for the next stop"}
            </small>
          </div>
        </article>
      </section>

      <section className="panel dashboard-panel dashboard-live-categories">
        <div className="panel-title">
          <div>
            <p className="eyebrow">
              SPENDING
            </p>
            <h2>By category</h2>
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
