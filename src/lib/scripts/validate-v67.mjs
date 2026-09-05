import fs from "node:fs";

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function must(text, needle, message) {
  if (!text.includes(needle)) {
    throw new Error(message);
  }
}

const schema = read("src/db/schema.ts");
const financial = read("src/lib/financial-close.ts");
const financialRoute = read("src/app/api/trips/[id]/financial-close/route.ts");
const expenseCreate = read("src/app/api/expenses/route.ts");
const expenseEdit = read("src/app/api/expenses/[id]/route.ts");
const settlementPage = read("src/app/(app)/settlements/page.tsx");
const dashboard = read("src/app/(app)/dashboard/page.tsx");
const analyticsRoute = read("src/app/api/analytics/event/route.ts");
const analyticsClient = read("src/lib/product-analytics-client.ts");
const analyticsUi = read("src/app/(app)/admin/insights/page.tsx");
const collaboration = read("src/components/CollaborationPulse.tsx");
const collaborationRoute = read("src/app/api/collaboration/pulse/route.ts");
const health = read("src/lib/health.ts");
const healthPage = read("src/app/(app)/admin/health/page.tsx");
const config = read("next.config.ts");
const css = read("src/app/globals.css");
const backup = read("src/app/api/admin/backup/route.ts");
const packageJson = read("package.json");
const mobileE2e = read("e2e/mobile-launch-candidate.spec.ts");

// Phase 9 — automated production quality gates.
must(packageJson, '"source:check"', "v67 source-integrity script missing");
must(packageJson, '"typecheck"', "v67 TypeScript build gate missing");
must(packageJson, '"v67:check"', "v67 regression validator script missing");
must(mobileE2e, "expectNoHorizontalOverflow", "v67 mobile overflow E2E coverage missing");
must(mobileE2e, "skip to main content", "v67 keyboard accessibility E2E coverage missing");

// Phase 10 — mobile/accessibility consistency.
must(css, ".skip-link", "v67 keyboard skip-link styling missing");
must(css, ":focus-visible", "v67 focus-visible styling missing");
must(css, "prefers-reduced-motion", "v67 reduced-motion support missing");
must(css, "min-height: 44px", "v67 mobile touch-target hardening missing");

// Phase 11 — financial integrity checkpoint.
must(schema, 'financialStatus: text("financial_status")', "v67 financial status schema missing");
must(schema, 'financialSnapshot: text("financial_snapshot")', "v67 financial snapshot schema missing");
must(financial, "closeTripFinancials", "v67 close-trip engine missing");
must(financial, "snapshotChecksum", "v67 tamper-evident financial snapshot checksum missing");
must(financial, "expenseLedgerLockedResponse", "v67 expense ledger lock helper missing");
must(financialRoute, 'z.enum(["CLOSE", "REOPEN"])', "v67 close/reopen API missing");
must(expenseCreate, "expenseLedgerLockedResponse", "v67 new expenses are not protected by financial lock");
must(expenseEdit, "expenseLedgerLockedResponse", "v67 edit/delete expense lock missing");
must(settlementPage, "FinancialClosePanel", "v67 financial checkpoint UI missing from settlement page");
must(dashboard, "finishedOpenTrips", "v67 post-trip finalization reminder missing");
must(backup, "financial_snapshot", "v67 backup restore does not preserve financial snapshot state");

// Phase 12 — collaboration.
must(collaboration, "Live trip update", "v67 collaboration update toast missing");
must(collaboration, '"mnm:expense-updated"', "v67 live expense refresh bridge missing");
must(collaborationRoute, "activityLogs", "v67 collaboration pulse does not use activity ledger");
must(collaborationRoute, "listAccessibleCountries", "v67 collaboration pulse access scoping missing");

// Phase 13 — privacy-minimal product analytics.
must(schema, 'productEvents = pgTable(', "v67 product analytics table missing");
must(analyticsClient, "trackProductEvent", "v67 product analytics client missing");
must(analyticsRoute, 'z.enum(eventNames)', "v67 analytics event allowlist missing");
must(analyticsRoute, "eventName: input.eventName", "v67 analytics event insert missing");
if (analyticsRoute.includes("userId: session.user.id")) { throw new Error("v67 aggregate analytics collector should not persist user ids"); }
must(analyticsUi, "No merchant names", "v67 analytics privacy explanation missing");
must(analyticsUi, "Expense save success", "v67 save reliability metric missing");

// Phase 14 — launch/security/readiness.
must(config, "Content-Security-Policy", "v67 CSP missing");
must(config, "poweredByHeader: false", "v67 framework disclosure hardening missing");
must(config, "Cross-Origin-Opener-Policy", "v67 COOP header missing");
must(health, "FINANCIAL_SNAPSHOT_INVALID", "v67 health scan does not validate closed-trip snapshots");
must(healthPage, "RELEASE GATE", "v67 launch-readiness gate missing");
must(healthPage, "external security review", "v67 must retain explicit external security-review gate");

const loadSmoke = read("scripts/load-smoke.mjs");
must(loadSmoke, "LOAD_TEST_ALLOW_REMOTE", "Phase 14 safe remote load opt-in missing");
must(loadSmoke, "p95Ms", "Phase 14 P95 load signal missing");
must(packageJson, '"load:smoke"', "Phase 14 load-smoke command missing");

console.log("v67 Phase 9–14 production launch-candidate validation passed.");
