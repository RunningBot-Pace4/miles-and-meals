import fs from "node:fs";

function read(file) { return fs.readFileSync(file, "utf8"); }
function must(text, needle, message) { if (!text.includes(needle)) throw new Error(message); }

const packageJson = read("package.json");
const worker = read("public/sw.js");
const expenseRoute = read("src/app/api/expenses/route.ts");
const expenseItemRoute = read("src/app/api/expenses/[id]/route.ts");
const travelRoute = read("src/app/api/travel-items/route.ts");
const travelItemRoute = read("src/app/api/travel-items/[id]/route.ts");
const queue = read("src/lib/offline-queue.ts");
const sync = read("src/components/OfflineQueueSync.tsx");
const offlineWorkspace = read("src/components/OfflinePackWorkspace.tsx");
const offlinePack = read("src/lib/offline-pack.ts");
const offlineApi = read("src/app/api/offline-pack/route.ts");
const expenseForm = read("src/components/ExpenseForm.tsx");
const planner = read("src/components/PlannerClient.tsx");
const validation = read("src/lib/validation.ts");
const more = read("src/app/(app)/more/page.tsx");
const manifest = read("public/manifest.webmanifest");
const offlineShell = read("public/offline.html");
const queueTests = read("tests/offline-queue.test.ts");
const e2e = read("e2e/mobile-v78-pwa-audit.spec.ts");
const cleanup = read("scripts/cleanup-legacy-files.mjs");
const offlinePage = read("src/app/(app)/offline/page.tsx");
const mobileNav = read("src/components/MobileNav.tsx");
const dashboardFinance = read("src/components/LiveDashboardFinance.tsx");
const settlementWorkspace = read("src/components/LiveSettlementWorkspace.tsx");
const css = read("src/app/globals.css");

must(packageJson, '"version": "1.92.20"', "v82-or-newer package version missing");
must(packageJson, '"v82:check"', "v82 validator command missing");
must(worker, "miles-meals-static-v92-20", "v82-or-newer service-worker cache bump missing");

for (const source of [expenseRoute, expenseItemRoute, travelRoute, travelItemRoute]) {
  must(source, "canAccessCountry", "cross-Trip offline sync must verify durable Trip access");
  if (source.includes("isCountryInActiveTrip")) {
    throw new Error("offline-capable mutation is still tied to the currently active Trip");
  }
}
must(expenseRoute, "TRIP_ACCESS_REMOVED", "expense access failures need an actionable error code");
must(queue, "status >= 400 && status < 500", "4xx offline failures are not classified safely");
must(queue, "![408, 425, 429].includes(status)", "retryable 4xx exception list missing");
must(queue, "if (item.blocked) continue", "blocked offline changes can still be retried forever");
must(queue, "This Trip is closed and read-only", "closed-Trip sync guidance missing");
must(sync, "Sync retryable changes", "offline sync control does not distinguish permanent failures");
if (`${sync}\n${offlineWorkspace}`.includes("forceBlocked")) {
  throw new Error("offline UI can still force blocked changes into a retry loop");
}
for (const marker of ["stops retrying a closed Trip response", "generic Forbidden response", "toHaveBeenCalledTimes(1)"]) {
  must(queueTests, marker, `offline retry regression coverage missing: ${marker}`);
}
must(queueTests, "recovers one legacy raw Forbidden item", "attempt-6 legacy recovery test missing");
must(queue, "Ready to retry with corrected Trip access", "legacy Forbidden queue recovery missing");

const removedFiles = [
  "src/app/(app)/inbox/page.tsx",
  "src/components/TripInboxClient.tsx",
  "src/app/api/trip-inbox/route.ts",
  "src/app/api/trip-inbox/[id]/add-to-plan/route.ts",
  "src/app/api/flight-lookup/route.ts",
  "src/lib/booking-parser.ts",
  "src/lib/flight-schedule.ts",
];
for (const file of removedFiles) {
  if (fs.existsSync(file)) throw new Error(`retired Trip Inbox source still exists: ${file}`);
}
for (const target of [
  "src/app/(app)/inbox",
  "src/app/api/trip-inbox",
  "src/app/api/flight-lookup",
  "src/components/TripInboxClient.tsx",
  "src/lib/booking-parser.ts",
  "src/lib/flight-schedule.ts",
  "tests/flight-schedule.test.ts",
]) {
  must(cleanup, `"${target}"`, `overlay cleanup does not remove retired source: ${target}`);
}
for (const [source, name] of [[more, "More menu"], [manifest, "manifest"], [e2e, "mobile E2E"]]) {
  if (source.includes("/inbox")) throw new Error(`${name} still links to retired Trip Inbox`);
}
if (planner.includes('["BOOKING"') || validation.includes('"BOOKING"')) {
  throw new Error("Planner still exposes the retired Bookings item type");
}
for (const [source, name] of [[offlineWorkspace, "offline workspace"], [offlinePack, "offline pack"], [offlineApi, "offline API"], [offlineShell, "offline shell"]]) {
  if (source.includes("reservations")) throw new Error(`${name} still exposes retired reservations`);
}
if (expenseForm.includes("financially locked trip")) {
  throw new Error("removed locked-Trip wording is still visible in Add Expense");
}
must(expenseForm, "friendlyExpenseSaveError", "Add Expense lacks friendly access-error handling");

for (const [source, name] of [[offlinePage, "offline page"], [offlineApi, "offline API"]]) {
  must(source, 'financialStatus !== "CLOSED"', `${name} does not exclude closed Trips`);
}
must(offlinePack, "isOpenPack", "device cache does not purge closed Trip packs");
must(offlineWorkspace, "splitMemberIds", "offline expense sharing selector is missing");
must(offlineWorkspace, "All Trip members can see the expense after sync", "offline sharing visibility guidance is missing");
must(offlineShell, "selectedMembers", "standalone offline sharing selector is missing");
must(offlineShell, 'financialStatus!=="CLOSED"', "standalone offline shell does not exclude closed Trips");
must(dashboardFinance, '"mnm:data-synced"', "Home wallet does not refresh immediately after offline sync");
must(settlementWorkspace, '"mnm:data-synced"', "Settlement does not refresh immediately after offline sync");
must(mobileNav, "createPortal", "mobile navigation is not owned by the document viewport");
must(css, 'body > .mobile-nav[data-app-mobile-nav="true"]', "viewport-fixed mobile navigation hardening is missing");
must(e2e, "remains attached to the viewport", "mobile navigation scroll regression coverage is missing");

console.log("v82.2 offline sharing, silent refresh, mobile navigation and v82 recovery validation passed.");
