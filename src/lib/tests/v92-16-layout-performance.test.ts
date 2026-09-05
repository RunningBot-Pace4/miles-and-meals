import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const rootLayout = read("src/app/layout.tsx");
const locationPage = read("src/app/(app)/location/page.tsx");
const permissions = read("src/components/TripPermissionsManager.tsx");
const css = read("src/app/v92-living-journey.css");
const session = read("src/lib/session.ts");
const notifications = read("src/lib/notification-count.ts");
const budgets = read("src/lib/trip-budget.ts");
const dashboardPage = read("src/app/(app)/dashboard/page.tsx");
const dashboardScope = read("src/lib/dashboard-scope.ts");
const warmup = read("src/components/OfflinePackWarmup.tsx");
const queue = read("src/components/OfflineQueueSync.tsx");
const bell = read("src/components/NotificationBell.tsx");
const center = read("src/components/NotificationCenter.tsx");
const collaboration = read("src/components/CollaborationPulse.tsx");
const budgetGate = read("src/components/BudgetAccessGate.tsx");
const expenses = read("src/components/LiveExpensesWorkspace.tsx");
const settlements = read("src/components/LiveSettlementWorkspace.tsx");
const planner = read("src/components/PlannerClient.tsx");

describe("V92.16 PWA layout and performance repair", () => {
  it("keeps the permissions notice copy out of the fixed icon column", () => {
    expect(permissions).toContain('className="permission-access-icon"');
    expect(permissions).toContain('className="permission-access-copy"');
    expect(css).toContain("grid-template-columns: 28px minmax(0, 1fr)");
    expect(css).toContain(".permission-access-copy strong,");
    expect(css).toContain("word-break: normal !important");
  });

  it("loads MapLibre styling only on the map location page", () => {
    expect(rootLayout).not.toContain("maplibre-gl/dist/maplibre-gl.css");
    expect(locationPage).toContain('import "maplibre-gl/dist/maplibre-gl.css"');
  });

  it("deduplicates request-scoped server reads and counts unread rows in SQL", () => {
    expect(session).toContain('import { cache } from "react"');
    expect(session).toContain("const readSession = cache(");
    expect(notifications).toContain("const readUnreadNotificationCount = cache(");
    expect(notifications).toContain("sql<number>`count(*)`");
    expect(notifications).not.toContain("return rows.length");
    expect(budgets).toContain("const readMissingTripBudgets = cache(");
    expect(budgets).toContain(".leftJoin(");
    expect(budgets).toContain("isNull(tripBudgets.userId)");
    expect(dashboardScope).toContain("selectedTrip: selectedTripRow");
    expect(dashboardPage).toContain("allTripsDataPromise.then(");
    expect(dashboardPage).toContain("data?.selectedTrip ?? loadSelectedData()");
  });

  it("does not refetch a full offline pack or flush an empty queue on every navigation", () => {
    expect(warmup).toContain("OFFLINE_PACK_REFRESH_STORAGE_KEY");
    expect(warmup).toContain("OFFLINE_PACK_WARMUP_DELAY_MS");
    expect(warmup).toContain("window.localStorage.getItem");
    expect(queue).toContain("if (initialItems.length > 0)");
    expect(queue).toContain("if (readOfflineQueue().length > 0) void sync()");
  });

  it("uses event-driven refreshes with load-safe fallback polling", () => {
    expect(bell).toContain("NOTIFICATION_POLL_INTERVAL_MS = 60_000");
    expect(center).toContain("NOTIFICATION_POLL_INTERVAL_MS = 30_000");
    expect(collaboration).toContain("POLL_MS = 60_000");
    expect(budgetGate).toContain("BUDGET_POLL_INTERVAL_MS = 120_000");
    expect(budgetGate).not.toContain("void checkMissingBudgets();\n\n    const timer");
    expect(expenses).toContain("POLL_INTERVAL_MS = 20_000");
    expect(settlements).toContain("POLL_INTERVAL_MS = 15_000");
    expect(planner).toContain("20_000");
  });
});
