import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const must = (source, marker, message) => {
  if (!source.includes(marker)) throw new Error(message);
};

const packageJson = read("package.json");
const worker = read("public/sw.js");
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

must(packageJson, '"version": "1.92.20"', "V92.16 package version missing");
must(packageJson, '"v92-16:check"', "V92.16 validation script missing");
must(packageJson, "npm run v92-16:check", "V92.16 validation is not in the build gate");
must(worker, "miles-meals-static-v92-20", "V92.16 service-worker cache missing");

for (const marker of ["permission-access-icon", "permission-access-copy", "Only the Trip Owner can change traveler permissions."]) {
  must(permissions, marker, `Permission notice structure missing: ${marker}`);
}
for (const marker of [".permission-access-copy strong", "word-break: normal !important"]) {
  must(css, marker, `Permission notice containment missing: ${marker}`);
}

if (rootLayout.includes("maplibre-gl/dist/maplibre-gl.css")) {
  throw new Error("MapLibre CSS still blocks every application route");
}
must(locationPage, 'import "maplibre-gl/dist/maplibre-gl.css"', "MapLibre CSS is missing from the location page");

must(session, "const readSession = cache(", "Session reads are not request-deduplicated");
must(notifications, "const readUnreadNotificationCount = cache(", "Notification count is not request-deduplicated");
must(notifications, "sql<number>`count(*)`", "Unread notifications still load every matching row");
must(budgets, ".leftJoin(", "Missing-budget detection still uses sequential queries");
must(budgets, "isNull(tripBudgets.userId)", "Missing-budget anti-join is incomplete");
must(dashboardScope, "selectedTrip: selectedTripRow", "All-trip Home does not expose its already-loaded selected-trip summary");
must(dashboardPage, "data?.selectedTrip ?? loadSelectedData()", "Home still recomputes selected-trip finance in all-trip mode");

for (const marker of ["OFFLINE_PACK_REFRESH_STORAGE_KEY", "OFFLINE_PACK_WARMUP_DELAY_MS", "window.localStorage.getItem"]) {
  must(warmup, marker, `Offline-pack navigation throttle missing: ${marker}`);
}
for (const marker of ["if (initialItems.length > 0)", "if (readOfflineQueue().length > 0) void sync()", "60_000"]) {
  must(queue, marker, `Empty offline queue guard missing: ${marker}`);
}

must(bell, "60_000", "Notification bell fallback polling is too aggressive");
must(center, "30_000", "Notification inbox fallback polling is too aggressive");
must(collaboration, "60_000", "Collaboration fallback polling is too aggressive");
must(budgetGate, "120_000", "Budget fallback polling is too aggressive");
must(budgetGate, '"mnm:budget-updated"', "Budget refresh event is missing");

console.log("V92.16 PWA layout and performance gate passed.");
