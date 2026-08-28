"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";

const BUDGET_POLL_INTERVAL_MS = 15_000;
const PASSWORD_PATH = "/settings/password";

type MissingBudgetPayload = {
  missingBudgetCount?: number;
  missing?: Array<{
    tripId: string;
  }>;
};

export function BudgetAccessGate({
  missingBudgetCount: initialMissingBudgetCount,
  missingTripId: initialMissingTripId,
  children,
}: {
  missingBudgetCount: number;
  missingTripId: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const redirectingRef = useRef(false);
  const checkingRef = useRef(false);
  const [missingBudgetCount, setMissingBudgetCount] =
    useState(initialMissingBudgetCount);
  const [missingTripId, setMissingTripId] =
    useState(initialMissingTripId);

  const checkMissingBudgets = useCallback(
    async () => {
      if (
        checkingRef.current ||
        !navigator.onLine ||
        document.visibilityState !== "visible"
      ) {
        return;
      }

      checkingRef.current = true;

      try {
        const response = await fetch(
          "/api/budgets",
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          return;
        }

        const payload =
          (await response.json()) as MissingBudgetPayload;
        const count = Math.max(
          0,
          Number(
            payload.missingBudgetCount ?? 0,
          ) || 0,
        );

        setMissingBudgetCount(count);
        setMissingTripId(
          count > 0
            ? payload.missing?.[0]?.tripId ?? ""
            : "",
        );
      } catch {
        // The server-rendered value remains the safe fallback while offline.
      } finally {
        checkingRef.current = false;
      }
    },
    [],
  );

  useEffect(() => {
    setMissingBudgetCount(
      initialMissingBudgetCount,
    );
    setMissingTripId(
      initialMissingTripId,
    );
  }, [
    initialMissingBudgetCount,
    initialMissingTripId,
  ]);

  useEffect(() => {
    void checkMissingBudgets();

    const timer = window.setInterval(
      () => {
        void checkMissingBudgets();
      },
      BUDGET_POLL_INTERVAL_MS,
    );

    const handleFocus = () => {
      void checkMissingBudgets();
    };

    window.addEventListener(
      "focus",
      handleFocus,
    );

    return () => {
      window.clearInterval(timer);
      window.removeEventListener(
        "focus",
        handleFocus,
      );
    };
  }, [checkMissingBudgets]);

  const blocked =
    missingBudgetCount > 0 &&
    pathname !== PASSWORD_PATH;

  useEffect(() => {
    if (
      !blocked ||
      redirectingRef.current
    ) {
      return;
    }

    redirectingRef.current = true;

    async function openBudgetSetup() {
      if (missingTripId) {
        try {
          await fetch(
            "/api/active-trip",
            {
              method: "POST",
              headers: {
                "content-type":
                  "application/json",
              },
              body: JSON.stringify({
                tripId: missingTripId,
              }),
            },
          );
        } catch {
          // Budget setup still works with the server-selected active trip.
        }
      }

      window.location.replace(
        "/onboarding/budget",
      );
    }

    void openBudgetSetup();
  }, [
    blocked,
    missingTripId,
  ]);

  if (blocked) {
    return (
      <div className="budget-gate-screen">
        <div className="budget-gate-card">
          <span
            aria-hidden="true"
          >
            ◈
          </span>
          <strong>
            New trip assigned
          </strong>
          <small>
            Opening your travel wallet so you can set your personal budget.
          </small>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
