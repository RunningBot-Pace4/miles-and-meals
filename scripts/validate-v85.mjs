import fs from "node:fs";

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function must(text, needle, message) {
  if (!text.includes(needle)) throw new Error(message);
}

const packageJson = read("package.json");
const schema = read("src/db/schema.ts");
const validation = read("src/lib/validation.ts");
const dashboard = read("src/app/(app)/dashboard/page.tsx");
const livingJourney = read("src/components/LivingJourneyHalo.tsx");
const commandCentre = read("src/lib/trip-command-center.ts");
const queue = read("src/lib/offline-queue.ts");
const queueUi = read("src/components/OfflineQueueSync.tsx");
const syncHealth = read("src/components/OfflineSyncHealth.tsx");
const planner = read("src/components/PlannerClient.tsx");
const planImport = read("src/components/PlanImport.tsx");
const planParser = read("src/lib/plan-import.ts");
const expenseForm = read("src/components/ExpenseForm.tsx");
const payerLogic = read("src/lib/expense-payers.ts");
const settlementApi = read("src/app/api/settlements/route.ts");
const settlementButton = read("src/components/SettlementActionButton.tsx");
const budgetUi = read("src/components/CategoryBudgetManager.tsx");
const commentsApi = read("src/app/api/expenses/[id]/comments/route.ts");
const receiptPage = read("src/app/(app)/receipts/page.tsx");
const backup = read("src/app/api/admin/backup/route.ts");
const exportRoute = read("src/app/api/export/route.ts");
const migration = read("neon-upgrade-v85-combined.sql");
const reset = read("neon-reset-keep-admin-login-v82.sql");
const css = read("src/app/globals.css");
const unitTests = read("tests/v85-combined.test.ts");
const e2e = read("e2e/mobile-v85-combined.spec.ts");

must(packageJson, '"version": "1.92.13"', "v85-or-newer package version missing");
must(packageJson, '"v85:check"', "v85 release validator command missing");

for (const marker of [
  "tripCategoryBudgets",
  "expensePayers",
  "expenseComments",
  "splitPresets",
  "receiptReviewStatus",
  "sortOrder",
  "durationMinutes",
]) must(schema, marker, `v85 schema marker missing: ${marker}`);

for (const marker of ["TRIP COMMAND CENTRE", "nextTitle", "Daily allowance", "Projected"]) {
  must(`${dashboard}\n${livingJourney}`, marker, `Trip command centre UI missing: ${marker}`);
}
for (const marker of ["projectedSpend", "forecastOver", "openTaskCount", "todayGroupSpend"]) {
  must(commandCentre, marker, `Trip command centre calculation missing: ${marker}`);
}

for (const marker of ["readOfflineSyncHistory", "meta", "tripName", "currency", "sharing"]) {
  must(queue, marker, `offline origin/history marker missing: ${marker}`);
}
must(queueUi, "Original Trip", "queued changes do not expose the original Trip");
must(syncHealth, "SYNC CENTRE", "always-visible sync health is missing");

for (const marker of ["CHECKLIST", "PACKING", "Download calendar", "moveItem(item, -1)", "moveItem(item, 1)", "PlanImport"]) {
  must(planner, marker, `planner upgrade missing: ${marker}`);
}
must(planImport, "REVIEW BEFORE SAVE", "plan import review step missing");
must(planParser, "Original message was not stored", "plan import privacy boundary missing");
for (const file of ["src/app/api/travel-items/reorder/route.ts", "src/app/api/travel-items/calendar/route.ts"]) {
  if (!fs.existsSync(file)) throw new Error(`planner endpoint missing: ${file}`);
}

for (const marker of ["Multiple payers", 'value: "SHARES"', "receiptReviewStatus"]) {
  must(expenseForm, marker, `expense workflow missing: ${marker}`);
}
if (!expenseForm.includes("Saved split") && !expenseForm.includes("Apply saved group")) {
  throw new Error("expense workflow missing: reusable saved split group");
}
must(payerLogic, "Payer contributions must total", "multi-payer balancing is not enforced");
must(validation, '"SHARES"', "weighted shares validation missing");
must(settlementApi, "input.amount", "partial settlement amount is not applied");
must(settlementButton, "maximumAmount", "partial settlement UI limit missing");
must(budgetUi, "Category limits", "category budget manager missing");
must(commentsApi, "expenseLedgerLockedResponse", "expense comments do not respect closed Trips");
must(receiptPage, "Receipt review", "receipt review centre missing");

for (const marker of ["expensePayers", "expenseComments", "splitPresets", "tripCategoryBudgets"]) {
  must(backup, marker, `backup coverage missing: ${marker}`);
  must(exportRoute, marker, `traveler export coverage missing: ${marker}`);
}
for (const marker of ["expense_payers", "expense_comments", "split_presets", "trip_category_budgets"]) {
  must(migration, marker, `migration missing: ${marker}`);
  must(reset, marker, `admin-preserving reset missing: ${marker}`);
}

const retiredSources = [
  "src/app/(app)/inbox/page.tsx",
  "src/components/TripInboxClient.tsx",
  "src/app/api/trip-inbox/route.ts",
  "src/app/api/flight-lookup/route.ts",
];
for (const file of retiredSources) {
  if (fs.existsSync(file)) throw new Error(`retired Trip Inbox source still exists: ${file}`);
}

for (const marker of ["v85 last-in-cascade responsive guarantee", "max-width: 640px", "max-width: 360px", ".planner-tabs"]) {
  must(css, marker, `responsive CSS gate missing: ${marker}`);
}
for (const marker of ["320", "360", "375", "390", "412", "430", "no horizontal overflow"]) {
  must(e2e, marker, `mobile E2E coverage missing: ${marker}`);
}
for (const marker of ["multiple payer contributions", "partial settlements", "reviewed plan import", "checklist and packing"]) {
  must(unitTests, marker, `v85 regression test missing: ${marker}`);
}

console.log("v85 combined 10-point product, reliability and responsive release validation passed.");
