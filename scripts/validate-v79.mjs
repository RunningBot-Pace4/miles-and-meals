import fs from "node:fs";

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function must(text, needle, message) {
  if (!text.includes(needle)) throw new Error(message);
}

const packageJson = read("package.json");
const css = read("src/app/globals.css");
const dateRange = read("src/components/DateRangePicker.tsx");
const offlineWorkspace = read("src/components/OfflinePackWorkspace.tsx");
const displayText = read("src/lib/display-text.ts");
const vitestConfig = read("vitest.config.ts");
const mobileE2e = read("e2e/mobile-v78-pwa-audit.spec.ts");
const offlineTests = read("tests/offline-queue.test.ts");
const worker = read("public/sw.js");

must(packageJson, '"version": "1.82.1"', "v79-or-newer package version missing");
must(packageJson, '"v79:check"', "v79 validator command missing");
must(worker, 'miles-meals-static-v82-1', "v79-or-newer service-worker cache bump missing");

for (const marker of [
  "v79 — complete responsive control",
  ".date-range-popover",
  "position: static",
  "max-inline-size: 100%",
  "text-overflow: ellipsis",
  "@media (max-width: 390px)",
]) {
  must(css, marker, `v79 responsive CSS missing: ${marker}`);
}

for (const marker of [
  "togglePicker",
  'aria-modal="false"',
  "aria-controls={calendarId}",
  ">Close</button>",
]) {
  must(dateRange, marker, `v79 in-flow date calendar missing: ${marker}`);
}

must(
  offlineWorkspace,
  "forceRetry: true",
  "v79 explicit Offline Pack sync must force an immediate retry",
);
must(offlineWorkspace, "This offline expense could not be saved", "v79 offline storage failure feedback missing");

must(displayText, "compactOptionText", "v79 compact native-select helper missing");
for (const file of [
  "src/components/TripQuickSelect.tsx",
  "src/components/CountryQuickSelect.tsx",
  "src/components/SettlementTripSelect.tsx",
  "src/components/WrappedTripSelect.tsx",
  "src/components/PlannerClient.tsx",
  "src/components/ExpenseForm.tsx",
  "src/components/LocationTracker.tsx",
  "src/components/AdminForms.tsx",
  "src/components/ProfileSettingsForm.tsx",
]) {
  must(read(file), "compactOptionText", `v79 long dropdown protection missing in ${file}`);
}

must(vitestConfig, 'exclude: ["e2e/**"', "v79 Vitest/Playwright separation missing");
must(vitestConfig, '"@": fileURLToPath', "v79 Vitest source alias missing");
for (const marker of [
  "expectFormControlsInsideViewport",
  'toHaveCount(42)',
  "browser-zoom containment",
  "long native-select labels stay contained",
]) {
  must(mobileE2e, marker, `v79 expanded layout E2E check missing: ${marker}`);
}
for (const marker of [
  "removes a mutation only after the server accepts it",
  "keeps validation failures visible for review",
  "retains connection failures for a later automatic retry",
]) {
  must(offlineTests, marker, `v79 offline resync regression test missing: ${marker}`);
}

console.log("v79 full responsive/function reliability validation passed.");
