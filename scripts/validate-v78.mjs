import fs from "node:fs";

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function must(text, needle, message) {
  if (!text.includes(needle)) throw new Error(message);
}

const settlementSelect = read("src/components/SettlementTripSelect.tsx");
const settlementPage = read("src/app/(app)/settlements/page.tsx");
const dateRange = read("src/components/DateRangePicker.tsx");
const tripManager = read("src/components/TripManager.tsx");
const adminForms = read("src/components/AdminForms.tsx");
const adminOverview = read("src/components/AdminOverview.tsx");
const journeyManager = read("src/components/JourneyManager.tsx");
const journeyPage = read("src/app/(app)/journeys/page.tsx");
const morePage = read("src/app/(app)/more/page.tsx");
const offlineQueue = read("src/lib/offline-queue.ts");
const offlineSync = read("src/components/OfflineQueueSync.tsx");
const offlineWorkspace = read("src/components/OfflinePackWorkspace.tsx");
const travelItemsRoute = read("src/app/api/travel-items/route.ts");
const travelItemRoute = read("src/app/api/travel-items/[id]/route.ts");
const rootLayout = read("src/app/layout.tsx");
const worker = read("public/sw.js");
const offlineHtml = read("public/offline.html");
const css = read("src/app/globals.css");
const e2e = read("e2e/mobile-v78-pwa-audit.spec.ts");
const tests = read("tests/v78-ux-reliability.test.ts");
const validation = read("src/lib/validation.ts");
const packageJson = read("package.json");

must(settlementSelect, "onChange={(event) => void changeTrip(event.target.value)}", "v78 Settle Up must load immediately when trip selection changes");
if (settlementSelect.includes(">\n          View trip\n")) {
  throw new Error("v78 Settle Up still contains the extra View trip button");
}
must(settlementPage, "Choose a trip and it opens instantly", "v78 Settle Up instant-selection guidance missing");

for (const marker of [
  "Now choose the end date",
  "date-range-grid",
  'startName ? <input type="hidden"',
]) {
  must(dateRange, marker, `v78 range calendar missing: ${marker}`);
}
if (!dateRange.includes("Tap one day for the start, then tap another day for the end.") && !dateRange.includes('className="date-range-instruction"')) {
  throw new Error("v78 range calendar is missing start/end selection guidance");
}
for (const source of [tripManager, adminForms, adminOverview, journeyManager]) {
  must(source, "DateRangePicker", "v78 trip/journey date editor has not been upgraded to the range picker");
}
must(validation, "Trip end date cannot be before the start date.", "v78 server trip-date ordering protection missing");

must(journeyPage, "You do not need a Journey for a normal one-country holiday", "v78 Journey explanation missing");
must(morePage, "Multi-country Journey · optional", "v78 More menu should explain Journey is optional");

for (const marker of [
  "automaticFlush",
  "updateOfflineMutation",
  "nextAttemptAt",
  "retryOfflineMutation",
  "Snapshot only the IDs",
]) {
  must(offlineQueue, marker, `v78 offline resync hardening missing: ${marker}`);
}
must(offlineSync, "retryOne", "v78 individual offline retry control missing");
must(offlineWorkspace, "Sync ${queueCount} pending", "v78 Offline Pack explicit resync control missing");
for (const marker of ["flushTail", "createMutationId", "already has ${MAX_ITEMS} unsynced changes"]) {
  must(offlineQueue, marker, `v78 final offline queue safety missing: ${marker}`);
}
must(travelItemsRoute, "Offline mutation identifier conflict.", "v78 planner-create idempotency is missing");
must(travelItemRoute, "plannerPayloadAlreadyApplied", "v78 planner-update retry idempotency is missing");
must(travelItemRoute, "idempotent: true", "v78 planner-delete retry idempotency is missing");

must(rootLayout, 'viewportFit: "cover"', "v78 PWA safe-area viewport-fit missing");
must(worker, 'miles-meals-static-v', "v78 service-worker versioned cache missing");
for (const marker of ["function createId()", "already has 60 unsynced changes", "localStorage.setItem(QUEUE_KEY"]) {
  must(offlineHtml, marker, `v78 offline fallback safety missing: ${marker}`);
}
must(e2e, "toBeGreaterThanOrEqual(16)", "v78 mobile form-font zoom regression check missing");
for (const width of ["320", "360", "375", "390", "412", "430"]) {
  must(e2e, `width: ${width}`, `v78 mobile audit missing ${width}px viewport`);
}
for (const marker of [
  ".date-range-popover",
  ".offline-queue-item-actions",
  ".date-range-guidance",
  "@media (max-width: 390px)",
  "@media (max-width: 350px)",
]) {
  must(css, marker, `v78 responsive CSS missing: ${marker}`);
}

must(packageJson, '"v78:check"', "v78 validator command missing");

console.log("v78 trip UX, offline resync and PWA mobile validation passed.");
