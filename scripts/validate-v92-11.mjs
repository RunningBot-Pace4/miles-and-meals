import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const must = (source, marker, message) => {
  if (!source.includes(marker)) throw new Error(message);
};

const packageJson = read("package.json");
const copyAssets = read("scripts/copy-maplibre-worker.mjs");
const receiptOcr = read("src/lib/receipt-ocr-client.ts");
const expenseForm = read("src/components/ExpenseForm.tsx");
const settlement = read("src/components/LiveSettlementWorkspace.tsx");
const expenses = read("src/components/LiveExpensesWorkspace.tsx");
const css = read("src/app/v92-living-journey.css");
const worker = read("public/sw.js");

must(packageJson, '"version": "1.92.20"', "V92.11 package version missing");
must(packageJson, '"v92-11:check"', "V92.11 validation script missing");
must(packageJson, "npm run v92-11:check", "V92.11 validation is not in the build gate");
must(worker, "miles-meals-static-v92-20", "V92.11 PWA cache missing");
must(worker, 'url.pathname.startsWith("/tesseract/")', "OCR runtime caching missing");

for (const marker of [
  "tesseractDestination",
  "tesseract-core-lstm.wasm.js",
  "tesseract-core-simd-lstm.wasm.js",
  "tesseract-core-relaxedsimd-lstm.wasm.js",
  "4.0.0_best_int",
  'for (const language of ["eng", "vie"])',
]) {
  must(copyAssets, marker, `Local OCR asset marker missing: ${marker}`);
}

for (const marker of [
  '"eng+vie"',
  'workerPath:',
  '"/tesseract/worker.min.js"',
  'corePath: "/tesseract/core"',
  'langPath: "/tesseract/lang"',
  "decodeReceiptImage",
  "const image = new Image()",
]) {
  must(receiptOcr, marker, `Receipt OCR repair marker missing: ${marker}`);
}

must(expenseForm, "Try scan again", "Receipt retry action missing");
must(settlement, "Sent · awaiting receipt", "Sent settlement label missing");
must(settlement, "Payment due", "Waiting settlement label missing");
must(expenses, "Paid · Waiting · Received", "Expenses Settle Up card content missing");
must(css, "/* V92.11 · local receipt OCR", "V92.11 styling missing");
must(css, ".expense-overview-card.settle-link", "Visible Settle Up card repair missing");
must(css, ".settlement-state-pill.sent", "Sent color state missing");
must(css, ".settlement-state-pill.waiting", "Waiting color state missing");

for (const path of [
  "public/tesseract/worker.min.js",
  "public/tesseract/core/tesseract-core-lstm.wasm.js",
  "public/tesseract/core/tesseract-core-simd-lstm.wasm.js",
  "public/tesseract/core/tesseract-core-relaxedsimd-lstm.wasm.js",
  "public/tesseract/lang/eng.traineddata.gz",
  "public/tesseract/lang/vie.traineddata.gz",
]) {
  if (!fs.existsSync(path)) throw new Error(`Generated OCR asset missing: ${path}`);
}

console.log("V92.11 receipt, settlement and Expenses validation passed.");
