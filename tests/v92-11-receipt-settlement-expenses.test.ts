import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const packageJson = readFileSync("package.json", "utf8");
const copyAssets = readFileSync("scripts/copy-maplibre-worker.mjs", "utf8");
const receiptOcr = readFileSync("src/lib/receipt-ocr-client.ts", "utf8");
const expenseForm = readFileSync("src/components/ExpenseForm.tsx", "utf8");
const settlement = readFileSync("src/components/LiveSettlementWorkspace.tsx", "utf8");
const expenses = readFileSync("src/components/LiveExpensesWorkspace.tsx", "utf8");
const css = readFileSync("src/app/v92-living-journey.css", "utf8");
const serviceWorker = readFileSync("public/sw.js", "utf8");

describe("V92.11 receipt, settlement and Expenses repairs", () => {
  it("ships the OCR engine and English/Vietnamese data from the app origin", () => {
    expect(packageJson).toContain('"@tesseract.js-data/eng": "1.0.0"');
    expect(packageJson).toContain('"@tesseract.js-data/vie": "1.0.0"');
    expect(copyAssets).toContain('"4.0.0_best_int"');
    expect(copyAssets).toContain('"tesseract-core-simd-lstm.wasm.js"');
    expect(receiptOcr).toContain('"eng+vie"');
    expect(receiptOcr).toContain('workerPath:\n        "/tesseract/worker.min.js"');
    expect(receiptOcr).toContain('corePath: "/tesseract/core"');
    expect(receiptOcr).toContain('langPath: "/tesseract/lang"');
    expect(serviceWorker).toContain('url.pathname.startsWith("/tesseract/")');
  });

  it("keeps an iOS-compatible image decoder and a visible retry action", () => {
    expect(receiptOcr).toContain("decodeReceiptImage");
    expect(receiptOcr).toContain("const image = new Image()");
    expect(expenseForm).toContain("Try scan again");
    expect(expenseForm).toContain("receipt-scan-retry");
  });

  it("uses unmistakable blue and amber settlement states", () => {
    expect(settlement).toContain("Sent · awaiting receipt");
    expect(settlement).toContain("Payment due");
    expect(css).toContain(".settlement-status-row.sent");
    expect(css).toContain("#3b82f6");
    expect(css).toContain(".settlement-status-row.waiting");
    expect(css).toContain("#e7a522");
  });

  it("restores the missing Settle Up card content on the Expenses page", () => {
    expect(expenses).toContain("Settle Up");
    expect(expenses).toContain("Paid · Waiting · Received");
    expect(css).toContain(".expense-overview-card.settle-link");
    expect(css).toContain("background: linear-gradient(145deg, #2f80ed, #1764c7) !important");
  });

  it("generates every required local OCR asset", () => {
    for (const path of [
      "public/tesseract/worker.min.js",
      "public/tesseract/core/tesseract-core-lstm.wasm.js",
      "public/tesseract/core/tesseract-core-simd-lstm.wasm.js",
      "public/tesseract/core/tesseract-core-relaxedsimd-lstm.wasm.js",
      "public/tesseract/lang/eng.traineddata.gz",
      "public/tesseract/lang/vie.traineddata.gz",
    ]) {
      expect(existsSync(path), `${path} should exist`).toBe(true);
    }
  });
});
