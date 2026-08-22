import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function must(source, needle, message) {
  if (!source.includes(needle)) {
    throw new Error(message);
  }
}

function mustNot(source, needle, message) {
  if (source.includes(needle)) {
    throw new Error(message);
  }
}

const settlement = read("src/lib/settlement.ts");
const ledger = read("src/lib/settlement-ledger.ts");
const live = read("src/components/LiveSettlementWorkspace.tsx");
const dashboard = read("src/app/(app)/dashboard/page.tsx");
const expenseForm = read("src/components/ExpenseForm.tsx");
const expenseCreate = read("src/app/api/expenses/route.ts");
const expenseUpdate = read("src/app/api/expenses/[id]/route.ts");
const planner = read("src/components/PlannerClient.tsx");
const plannerUpdate = read("src/app/api/travel-items/[id]/route.ts");
const validation = read("src/lib/validation.ts");
const offlineQueue = read("src/lib/offline-queue.ts");
const offlineUi = read("src/components/OfflineQueueSync.tsx");
const settlementApi = read("src/app/api/settlements/route.ts");
const dashboardLib = read("src/lib/dashboard.ts");
const health = read("src/lib/health.ts");
const nextConfig = read("next.config.ts");
const css = read("src/app/globals.css");
const smartTest = read("tests/smart-settlement.test.ts");

// Smart Settlement must be a recommendation layer; do not replace the existing action ledger.
must(settlement, "calculateSmartSettlementPlan", "v66 Smart Settlement engine missing");
must(settlement, "accounts.length > 11", "v66 large-group Smart Settlement fallback missing");
must(ledger, "optimizedOutstanding = calculateSmartSettlementPlan(currentOutstanding)", "v66 Smart Settlement must optimize remaining balances");
must(ledger, "const waitingTransfers = currentOutstanding.map(decorate)", "v66 must keep the existing settlement action flow unchanged");
must(ledger, 'optimizationMode: "EXACT" | "SIMPLIFIED"', "v66 Smart Settlement optimization mode missing");
must(live, "Settle with fewer transfers.", "v66 Smart Settlement mobile/report UI missing");
must(live, "read-only recommendation", "v66 Smart Settlement must explain that source records are unchanged");
must(live, "See how this was calculated", "v66 Smart Settlement explainability missing");
must(dashboard, "tripEndedAtLeastOneDayAgo", "v66 post-trip Smart Settlement readiness check missing");
must(dashboard, "Smart settlement ready", "v66 Home post-trip Smart Settlement prompt missing");
must(smartTest, 'fromUserId: "jh"', "v66 user-example Smart Settlement regression test missing");
must(smartTest, 'amount: 10', "v66 JH -> JY RM10 regression expectation missing");

// Financial reliability: client request idempotency and stale-edit protection.
must(validation, "clientRequestId: uuidSchema.optional()", "v66 expense idempotency request id missing");
must(expenseForm, "clientRequestIdRef", "v66 expense client idempotency state missing");
must(expenseCreate, "REQUEST_ID_CONFLICT", "v66 expense request-id conflict protection missing");
must(expenseCreate, "idempotent: true", "v66 expense retry idempotent response missing");
must(expenseCreate, "recovered: true", "v66 interrupted expense save recovery missing");
must(validation, "expenseUpdateSchema", "v66 expense stale-edit schema missing");
must(expenseForm, "expectedUpdatedAt: initial?.updatedAt", "v66 expense expected revision timestamp missing");
must(expenseUpdate, 'code: "STALE_EDIT"', "v66 expense stale-edit rejection missing");
must(planner, "expectedUpdatedAt: editingItem.updatedAt", "v66 planner stale-edit timestamp missing");
must(plannerUpdate, 'code: "STALE_EDIT"', "v66 planner stale-edit rejection missing");

// Offline conflicts must be visible/recoverable instead of silently looping forever.
must(offlineQueue, "blocked?: boolean", "v66 blocked offline mutation state missing");
must(offlineQueue, "shouldBlockForStatus", "v66 offline conflict classification missing");
must(offlineUi, "needs attention", "v66 offline review UI missing");
must(offlineUi, "Retry reviewed changes", "v66 offline manual retry action missing");
must(offlineUi, "Discard", "v66 offline discard recovery missing");

// Settlement actions should tolerate harmless retries.
must(settlementApi, "idempotent: true", "v66 settlement action idempotency missing");
must(settlementApi, "existingPending", "v66 pending-settlement retry detection missing");

// Privacy/security/reliability hardening.
must(ledger, ".where(inArray(user.id, [...participantIds]))", "v66 settlement name query must be participant-scoped");
must(dashboardLib, ".where(inArray(user.id, [...participantIds]))", "v66 dashboard name query must be participant-scoped");
must(nextConfig, 'key: "X-Content-Type-Options"', "v66 nosniff header missing");
must(nextConfig, 'key: "X-Frame-Options"', "v66 clickjacking header missing");
must(nextConfig, 'key: "Referrer-Policy"', "v66 referrer policy missing");
must(nextConfig, 'key: "Permissions-Policy"', "v66 permissions policy missing");
must(nextConfig, 'key: "Strict-Transport-Security"', "v66 HSTS header missing");
must(health, 'type: "SETTLEMENT_SAME_PARTICIPANT"', "v66 settlement integrity check missing");
must(health, 'type: "SETTLEMENT_INVALID_AMOUNT"', "v66 settlement amount integrity check missing");
must(health, 'type: "SETTLEMENT_CONFIRMATION_MISSING"', "v66 settlement confirmation integrity check missing");

// Mobile-first treatment for the new trust/recovery surfaces.
must(css, ".smart-settlement-panel", "v66 Smart Settlement styling missing");
must(css, ".smart-transfer-card", "v66 Smart Settlement transfer-card styling missing");
must(css, ".offline-queue-manager", "v66 offline recovery styling missing");
must(css, "@media (max-width: 420px)", "v66 narrow-phone responsive treatment missing");

// The recommendation must not mutate financial source records.
mustNot(live, "Mark paid using Smart Settlement", "v66 Smart Settlement must remain recommendation-only");

console.log("v66 Smart Settlement + trust hardening validation passed.");
