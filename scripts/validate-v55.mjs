import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const failures = [];
const fail = (message) => failures.push(message);

const expenseForm = read("src/components/ExpenseForm.tsx");
const receiptClient = read("src/lib/receipt-ocr-client.ts");
const receiptParser = read("src/lib/receipt-parser.ts");
const dashboard = read("src/app/(app)/dashboard/page.tsx");
const allTrips = read("src/components/AllTripsOverview.tsx");

if (
  !expenseForm.includes('aria-label="Transaction currency"') ||
  !expenseForm.includes("currencyOptions.map") ||
  !expenseForm.includes("/api/fx?base=") ||
  !expenseForm.includes("Daily reference")
) {
  fail("Add Expense must use a currency dropdown with optional daily FX lookup.");
}

if (
  !receiptClient.includes("bottomEnhanced") ||
  !receiptClient.includes("BOTTOM_BINARY") ||
  !receiptClient.includes("Verifying final total") ||
  !receiptParser.includes("next two OCR lines") ||
  !receiptParser.includes("looksLikeMoney")
) {
  fail("Receipt OCR must use the v55 enhanced total-area scan and parser safeguards.");
}

if (
  !dashboard.includes("allTripOverview") ||
  !dashboard.includes("<AllTripsOverview") ||
  !allTrips.includes("ALL TRIPS") ||
  !allTrips.includes("Open this trip") ||
  !allTrips.includes('fetch("/api/active-trip"')
) {
  fail("Home must show the all-trips overview while preserving active-trip switching.");
}

if (failures.length) {
  console.error("v55 validation failed:");
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log("v55 currency + receipt OCR + all-trips Home validation passed.");
