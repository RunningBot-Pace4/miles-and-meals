"use client";

import {
  useEffect,
} from "react";
import {
  usePathname,
} from "next/navigation";

const gatedPrefixes = [
  "/dashboard",
  "/expenses",
  "/planner",
  "/location",
  "/settlements",
  "/activity",
  "/export",
];

function needsBudgetGate(
  pathname: string,
): boolean {
  return gatedPrefixes.some(
    (prefix) =>
      pathname === prefix ||
      pathname.startsWith(
        `${prefix}/`,
      ),
  );
}

export function BudgetAccessGate({
  missingBudgetCount,
  children,
}: {
  missingBudgetCount: number;
  children: React.ReactNode;
}) {
  const pathname =
    usePathname();
  const blocked =
    missingBudgetCount > 0 &&
    needsBudgetGate(
      pathname,
    );

  useEffect(() => {
    if (!blocked) {
      return;
    }

    window.location.replace(
      "/onboarding/budget",
    );
  }, [blocked]);

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
            Setting up your travel wallet…
          </strong>
          <small>
            Your personal trip budget is needed before travel data opens.
          </small>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
