import { existsSync, readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function must(source, marker, message) {
  if (!source.includes(marker)) {
    throw new Error(message);
  }
}

const packageJson = read("package.json");
const worker = read("public/sw.js");
const appLoading = read("src/app/(app)/loading.tsx");
const ledger = read("src/lib/individual-payment-ledger.ts");
const workspace = read("src/components/LiveSettlementWorkspace.tsx");
const css = read("src/app/v92-living-journey.css");
const test = read("tests/individual-payment-ledger.test.ts");

must(packageJson, '"version": "1.92.24"', "V92.22 package version missing");
must(packageJson, '"v92-22:check"', "V92.22 release gate missing");
must(packageJson, "npm run v92-22:check", "V92.22 gate is not in prebuild");
must(worker, "miles-meals-static-v92-24", "V92.22 PWA cache missing");

if (existsSync("src/app/loading.tsx")) {
  throw new Error("Duplicate root loading boundary still exists");
}

must(appLoading, "BrandedLoadingScreen", "Authenticated app Halo loading boundary missing");

for (const marker of [
  "buildIndividualPaymentLedgers",
  'confirmationStatus: "PENDING" | "CONFIRMED"',
  'progressStatus: "PARTIAL" | "FULL"',
  "remainingAfter",
  "pendingAmount + ledger.remainingAmount",
]) {
  must(ledger, marker, `Individual payment calculation missing: ${marker}`);
}

for (const marker of [
  "Payments by person",
  "Payment transactions",
  "Awaiting confirmation",
  "Still to pay",
  "Still to receive",
  "Remaining after",
  "Completed · View only",
]) {
  must(workspace, marker, `Individual payment UI missing: ${marker}`);
}

for (const marker of [
  "/* V92.22 · one loading boundary + individual payment transaction ledger",
  ".individual-payment-card > summary",
  ".individual-payment-metrics",
  ".individual-payment-transaction",
  "@media (max-width: 719px)",
  "@media (max-width: 360px)",
]) {
  must(css, marker, `V92.22 responsive payment styling missing: ${marker}`);
}

for (const marker of [
  "keeps three payment transactions separate with a running balance",
  "PARTIAL_PENDING",
  "PENDING_CONFIRMATION",
  "remainingAfter: 10",
]) {
  must(test, marker, `V92.22 payment regression coverage missing: ${marker}`);
}

console.log("V92.22 single Halo boundary and individual payment ledger gate passed.");
