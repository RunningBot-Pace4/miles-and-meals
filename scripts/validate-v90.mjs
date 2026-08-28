import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const must = (text, needle, message) => { if (!text.includes(needle)) throw new Error(message); };
const mustExist = (file) => { if (!fs.existsSync(file)) throw new Error(`V90 source missing: ${file}`); };

const packageJson = read("package.json");
const schema = read("src/db/schema.ts");
const permissions = read("src/lib/trip-capabilities.ts");
const expenseApi = read("src/app/api/expenses/route.ts");
const plannerApi = read("src/app/api/travel-items/route.ts");
const documentsApi = read("src/app/api/trip-documents/route.ts");
const offlinePack = read("src/lib/offline-pack.ts");
const offlineApi = read("src/app/api/offline-pack/route.ts");
const queue = read("src/lib/offline-queue.ts");
const queueUi = read("src/components/OfflineQueueSync.tsx");
const offlineShell = read("public/offline.html");
const routeLogic = read("src/lib/smart-route.ts");
const companion = read("src/lib/trip-companion.ts");
const health = read("src/app/(app)/admin/health/page.tsx");
const more = read("src/app/(app)/more/page.tsx");
const backup = read("src/app/api/admin/backup/route.ts");
const exportRoute = read("src/app/api/export/route.ts");
const migration = read("neon-upgrade-v90-combined.sql");
const reset = read("neon-reset-keep-admin-login-v82.sql");
const css = read("src/app/globals.css");
const unit = read("tests/v90-market-readiness.test.ts");
const queueTests = read("tests/offline-queue.test.ts");
const e2e = read("e2e/mobile-v90-market-audit.spec.ts");
const scorecard = read("V90-COMBINED-WORLD-CLASS-TARGET.md");

must(packageJson, '"version": "1.92.7"', "V90-or-newer package version missing");
must(packageJson, '"v90:check"', "V90 validator command missing");
must(read("public/sw.js"), "miles-meals-static-v92-7", "V90-or-newer service-worker cache was not bumped");

for (const marker of ["tripMemberPermissions", "tripDocuments", "tripEmergencyContacts", "tripMemories"]) {
  must(schema, marker, `V90 schema marker missing: ${marker}`);
  must(backup, marker, `V90 backup/restore coverage missing: ${marker}`);
  must(exportRoute, marker, `V90 traveler export coverage missing: ${marker}`);
}
for (const marker of ["trip_member_permissions", "trip_documents", "trip_emergency_contacts", "trip_memories"]) {
  must(migration, marker, `V90 migration table missing: ${marker}`);
  must(reset, marker, `V90 admin-preserving reset coverage missing: ${marker}`);
}

for (const marker of ["canEditPlan", "canAddExpenses", "canViewDocuments", "canAddMemories"]) must(permissions, marker, `permission capability missing: ${marker}`);
must(expenseApi, ").canAddExpenses", "expense API does not enforce V90 permissions");
must(plannerApi, "capabilities.canEditPlan", "Plan API does not enforce V90 permissions");
must(documentsApi, "capabilities.canViewDocuments", "document API does not enforce V90 permissions");

for (const file of [
  "src/app/(app)/companion/page.tsx",
  "src/app/(app)/documents/page.tsx",
  "src/app/(app)/memories/page.tsx",
  "src/app/(app)/settings/permissions/page.tsx",
  "src/components/SmartDayRoute.tsx",
]) mustExist(file);
for (const route of ["/companion", "/documents", "/memories", "/settings/permissions"]) must(more, route, `More menu is missing ${route}`);

for (const marker of ["suggestedDayOrder", "overlaps", "travelmode", "defaultBuffer"]) must(routeLogic, marker, `smart route behavior missing: ${marker}`);
for (const marker of ["emergency", "expiring", "receipts", "forecastOver", "settlement", "memory"]) must(companion, marker, `companion suggestion missing: ${marker}`);

for (const marker of ["version: 3", "expenses:", "finance:", "documents:", "emergencyContacts:", "memories:"]) must(offlineApi, marker, `offline Pack 3.0 payload missing: ${marker}`);
must(offlinePack, "pack.version === 2 || pack.version === 3", "offline Pack 2.0 upgrade compatibility missing");
for (const marker of ["editOfflineMutation", "original mutation", "attempts: 0", "Edited and ready to sync"]) must(queue, marker, `editable queue safety missing: ${marker}`);
for (const marker of ["Save correction", "Original Trip, currency, payer and sharing cannot be changed", "Sync centre"]) must(queueUi, marker, `queue recovery UI missing: ${marker}`);
must(queueTests, "without changing its Trip, currency or sharing", "offline edit context regression test missing");
must(offlineShell, "x.version===2||x.version===3", "standalone offline Pack 3 compatibility missing");

must(health, "checkRequiredDataModel", "admin required-data migration readiness check missing");
must(health, "42P01", "admin health does not distinguish missing tables from connection failures");
must(health, "Manual evidence still required", "honest production proof boundary missing");
for (const marker of ["10/10", "global top-10 status is not yet proven", "real iPhone", "load test", "security review"]) must(scorecard, marker, `honest scorecard evidence missing: ${marker}`);

for (const marker of ["v90 — permissions", "max-width: 430px", "overflow-x: clip", ".offline-queue-editor", ".smart-day-route"]) must(css, marker, `V90 responsive CSS gate missing: ${marker}`);
for (const marker of ["320", "360", "375", "390", "412", "430", "no horizontal overflow", "/companion", "/documents", "/offline"]) must(e2e, marker, `V90 mobile E2E coverage missing: ${marker}`);
for (const marker of ["prioritizes actionable safety", "detects an overlap", "private travel files"]) must(unit, marker, `V90 unit coverage missing: ${marker}`);

for (const file of [
  "src/app/(app)/inbox/page.tsx",
  "src/components/TripInboxClient.tsx",
  "src/app/api/trip-inbox/route.ts",
  "src/app/api/flight-lookup/route.ts",
]) if (fs.existsSync(file)) throw new Error(`retired Trip Inbox source still exists: ${file}`);

console.log("V90 Combined code-level 10/10 acceptance target validation passed; external market proof remains explicitly required.");
