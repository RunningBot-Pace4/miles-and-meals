import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const must = (source, marker, message) => {
  if (!source.includes(marker)) throw new Error(message);
};

const nav = read("src/components/MobileNav.tsx");
const more = read("src/app/(app)/more/page.tsx");
const spend = read("src/app/(app)/spend/page.tsx");
const addHub = read("src/app/(app)/add/page.tsx");
const statement = read("src/app/(app)/settlements/statement/page.tsx");
const schema = read("src/db/schema.ts");
const validation = read("src/lib/validation.ts");
const settlementApi = read("src/app/api/settlements/route.ts");
const ledger = read("src/lib/settlement-ledger.ts");
const proofRoute = read("src/app/api/settlements/[id]/proof/route.ts");
const dashboardScope = read("src/lib/dashboard-scope.ts");
const backup = read("src/app/api/admin/backup/route.ts");
const migration = read("database/V95-payment-evidence-person-statements.sql");

for (const marker of [
  '{ href: "/add", label: "Add", icon: "plus", action: true }',
  '{ href: "/spend", label: "Spend", icon: "spend" }',
  '"/settings/budgets"',
  '"/location"',
]) must(nav, marker, `V95 navigation marker missing: ${marker}`);

for (const marker of [
  "Trip & account tools",
  "Trip Story · memories & Wrapped",
  "Updates",
  "Search, export & Journey tools",
]) must(more, marker, `V95 More consolidation missing: ${marker}`);


for (const marker of [
  "Add to the trip",
  'href="/expenses/new"',
  'href="/planner?add=1"',
  'href="/memories"',
  'href="/documents"',
]) must(addHub, marker, `V95 Add hub missing: ${marker}`);

for (const marker of [
  "Trip money",
  'href="/expenses"',
  'href="/settlements"',
  'href="/settings/budgets"',
  'href="/receipts"',
]) must(spend, marker, `V95 Spend hub missing: ${marker}`);

for (const marker of [
  "PERSON STATEMENT",
  "Original bills",
  "Active direct payments",
  "Bill-specific paid",
  "Payment history",
  "View payment proof",
  "<BillSettlementAllocator",
]) must(statement, marker, `V95 person statement missing: ${marker}`);

for (const marker of [
  'paymentMethod: text("payment_method")',
  'paymentReference: text("payment_reference")',
  'paymentNote: text("payment_note")',
  'paymentProofData: text("payment_proof_data")',
]) must(schema, marker, `V95 settlement schema missing: ${marker}`);

for (const marker of [
  '"DUITNOW"',
  '"BANK_TRANSFER"',
  '"TOUCH_N_GO"',
  "paymentReference",
  "paymentProofData",
  "700_000",
]) must(validation, marker, `V95 payment validation missing: ${marker}`);

for (const marker of [
  "paymentMethod: input.paymentMethod || null",
  "paymentReference: input.paymentReference || null",
  "paymentNote: input.paymentNote || null",
  "paymentProofData: input.paymentProofData || null",
  "textMatches(existingRequest.paymentProofData, input.paymentProofData)",
]) must(settlementApi, marker, `V95 settlement persistence missing: ${marker}`);

for (const marker of [
  "paymentProofAvailable",
  "paymentMethod: row.paymentMethod ?? null",
  "paymentReference: row.paymentReference ?? null",
]) must(ledger, marker, `V95 settlement ledger metadata missing: ${marker}`);

for (const marker of [
  "parseImageDataUrl",
  "canAccessCountry",
  '"x-content-type-options": "nosniff"',
]) must(proofRoute, marker, `V95 proof route missing: ${marker}`);

for (const marker of [
  "allocatedPaid: balance.allocatedPaid * factor",
  "remainingAmount: expense.remainingAmount * factor",
  "amount: allocation.amount * factor",
]) must(dashboardScope, marker, `V95 display-currency allocation scaling missing: ${marker}`);

must(backup, "const BACKUP_VERSION = 6;", "V95 backup format must be version 6");
for (const marker of [
  "payment_method",
  "payment_reference",
  "payment_note",
  "payment_proof_data",
]) must(backup, marker, `V95 backup/restore field missing: ${marker}`);

for (const marker of [
  "ADD COLUMN IF NOT EXISTS payment_method",
  "ADD COLUMN IF NOT EXISTS payment_proof_data",
]) must(migration, marker, `V95 migration missing: ${marker}`);

console.log("V95 IA, person statements and payment evidence gate passed.");
