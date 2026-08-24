import fs from "node:fs";

function read(file) { return fs.readFileSync(file, "utf8"); }
function must(text, needle, message) { if (!text.includes(needle)) throw new Error(message); }
function mustNot(text, needle, message) { if (text.includes(needle)) throw new Error(message); }

const packageJson = read("package.json");
const serviceWorker = read("public/sw.js");
const settlementSelect = read("src/components/SettlementTripSelect.tsx");
const tripManager = read("src/components/TripManager.tsx");
const dateRangePicker = read("src/components/DateRangePicker.tsx");
const dateRangeLogic = read("src/lib/date-range.ts");
const tripInbox = read("src/components/TripInboxClient.tsx");
const offlineQueue = read("src/lib/offline-queue.ts");
const mobileE2e = read("e2e/mobile-v69-complete-flow.spec.ts");
const v78E2e = read("e2e/v78-ux.spec.ts");
const vitestConfig = read("vitest.config.ts");

must(packageJson, '"version": "1.78.0"', "v78 package version missing");
must(serviceWorker, "miles-meals-static-v78", "v78 PWA cache generation missing");
must(settlementSelect, "changeTrip(event.target.value)", "Settle Up dropdown is not instant");
mustNot(settlementSelect, ">\n          View trip\n", "Settle Up still exposes the extra View trip button");
must(tripManager, "DateRangePicker", "Trip dates are not using the shared range calendar");
for (const marker of ["Tap once for start, once for end", "data-date=", "range-start", "range-end"]) {
  must(dateRangePicker, marker, `Date range picker missing ${marker}`);
}
must(dateRangeLogic, "selectDateRange", "Date-range selection logic missing");
must(tripInbox, "Use the full confirmation, not only the number", "Trip Inbox lookup scope is unclear");
for (const marker of ["flushInFlight", "snapshotIds", "additions", "retainedFailures"]) {
  must(offlineQueue, marker, `Offline resync hardening missing ${marker}`);
}
for (const route of ['"/journeys"', '"/inbox"', '"/offline"']) {
  must(mobileE2e, route, `Mobile E2E coverage missing ${route}`);
}
must(mobileE2e, "320px compact phone", "320px phone coverage missing");
must(v78E2e, "tablet portrait", "Tablet E2E coverage missing");
must(v78E2e, "desktop", "Desktop E2E coverage missing");
must(vitestConfig, 'exclude: ["e2e/**"', "Vitest must not collect Playwright E2E specs");
must(vitestConfig, 'new URL("./src"', "Vitest @/ source alias missing");

console.log("v78 requested UX and PWA reliability validation passed.");
