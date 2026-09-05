import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const failures = [];
const fail = (message) => failures.push(message);

const expenseForm = read("src/components/ExpenseForm.tsx");
const receiptClient = read("src/lib/receipt-ocr-client.ts");
const receiptParser = read("src/lib/receipt-parser.ts");
const tripSelect = read("src/components/TripQuickSelect.tsx");

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
  !tripSelect.includes("View all trips") ||
  !tripSelect.includes("/api/active-trip")
) {
  fail("Home must retain an all-trips option while preserving active-trip switching.");
}

if (failures.length) {
  console.error("v55 validation failed:");
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log("v55 currency + receipt OCR + Home trip scope validation passed.");
