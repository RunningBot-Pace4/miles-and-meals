import fs from "node:fs";

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function must(text, needle, message) {
  if (!text.includes(needle)) throw new Error(message);
}

const ledger = read("src/lib/settlement-ledger.ts");
const live = read("src/components/LiveSettlementWorkspace.tsx");
const scope = read("src/lib/dashboard-scope.ts");
const css = read("src/app/globals.css");
const packageJson = read("package.json");
const e2e = read("e2e/smart-settlement-audit-v70.spec.ts");

must(ledger, "SmartSettlementExpenseLine", "v70 expense-level Smart Settlement audit data missing");
must(ledger, "SmartSettlementOriginalBalance", "v70 original-balance audit model missing");
must(ledger, "SmartSettlementPaymentLine", "v70 payment-history audit model missing");
must(ledger, "SmartSettlementNetPosition", "v70 net-position explanation model missing");
must(ledger, "originalExpenseBalances", "v70 original expense balances are not included in Smart Settlement plans");
must(ledger, "recordedPayments", "v70 recorded settlement payments are not included in Smart Settlement plans");
must(ledger, "remainingNet: roundMoney(receives - owes + sent - received)", "v70 transparent remaining-net calculation missing");

must(live, '"SMART" | "ORIGINAL" | "HISTORY"', "v70 Smart Settlement audit tabs missing");
must(live, "View details", "v70 recommended transfer drill-down missing");
must(live, "Original Balances", "v70 Original Balances view missing");
must(live, "Expenses behind these net positions", "v70 contributing-expense explanation missing");
must(live, "Payments already recorded", "v70 settlement payment history view missing");
must(live, "View expense", "v70 expense-level drill-through missing");
must(live, "Nothing is rewritten", "v70 read-only ledger-safety explanation missing");

must(scope, "originalExpenseBalances: plan.originalExpenseBalances.map", "v70 all-trip currency conversion misses original-balance audit data");
must(scope, "recordedPayments: plan.recordedPayments.map", "v70 all-trip currency conversion misses payment audit data");
must(scope, "netPositions: plan.netPositions.map", "v70 all-trip currency conversion misses net positions");

must(css, ".smart-settlement-tabs", "v70 Smart Settlement tab styling missing");
must(css, ".smart-transfer-details", "v70 transfer-detail styling missing");
must(css, ".smart-original-balance-card", "v70 original-balance mobile card styling missing");
must(css, ".smart-payment-audit-row", "v70 payment-history styling missing");
must(e2e, "Original Balances", "v70 Smart Settlement audit E2E coverage missing");
must(e2e, "View details", "v70 transfer drill-down E2E coverage missing");
must(packageJson, '"v70:check"', "v70 package validation command missing");

console.log("v70 explainable Smart Settlement audit trail validation passed.");
