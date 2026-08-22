import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function must(source, needle, message) {
  if (!source.includes(needle)) {
    throw new Error(message);
  }
}

const dashboard = read("src/app/(app)/dashboard/page.tsx");
const expenseForm = read("src/components/ExpenseForm.tsx");
const expenseRoute = read("src/app/api/expenses/route.ts");
const receiptParser = read("src/lib/receipt-parser.ts");
const planner = read("src/components/PlannerClient.tsx");
const search = read("src/app/(app)/search/page.tsx");
const wrapped = read("src/app/(app)/wrapped/page.tsx");
const offlineQueue = read("src/lib/offline-queue.ts");
const queueSync = read("src/components/OfflineQueueSync.tsx");
const appLayout = read("src/app/(app)/layout.tsx");
const rootLayout = read("src/app/layout.tsx");
const css = read("src/app/globals.css");

must(dashboard, "dashboard-action-centre", "v59 Home action centre missing");
must(dashboard, "dashboard-recent-activity", "v59 Home activity timeline missing");
must(receiptParser, "receiptDate", "v60 receipt date extraction missing");
must(receiptParser, "categorySuggestion", "v60 receipt category suggestion missing");
must(expenseRoute, "POSSIBLE_DUPLICATE", "v60 duplicate API protection missing");
must(expenseForm, "Possible duplicate", "v60 duplicate UI missing");
must(planner, "planner-expense-button", "v61 Planner → Expense action missing");
must(search, "Search your trips", "v61 global trip search missing");
must(offlineQueue, "flushOfflineQueue", "v62 offline queue missing");
must(queueSync, "waiting to sync", "v62 offline queue sync UI missing");
must(appLayout, "<OfflineQueueSync />", "authenticated app layout must own offline sync");
if (rootLayout.includes("OfflineQueueSync")) {
  fail("root layout must not sync protected offline mutations while logged out");
}
must(wrapped, "TRIP WRAPPED", "v63 Trip Wrapped missing");
must(css, "grid-template-columns: repeat(4, minmax(0, 1fr));", "v63 mobile 4-column category layout missing");
if (
  !expenseForm.includes("currency-name") &&
  !expenseForm.includes('className="advanced-currency-control"')
) {
  throw new Error("v63+ mobile currency control missing");
}

console.log("v63 consolidated mobile + v59-v63 validation passed.");
