// Run from the project root after `npx playwright install chromium`.
// Static production-component fixture only; no live database or payment calls.
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { writeFileSync } from "node:fs";

execFileSync(process.execPath, ["--import", "tsx", "scripts/preview-pwa.tsx"], { stdio: "inherit" });
const browser = await chromium.launch();
const results = [];
try {
  for (const width of [360, 390, 430, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(pathToFileURL(resolve("test-results/pwa-preview.html")).href);
    await page.locator(".settlement-payment-details").evaluateAll(nodes => nodes.forEach(node => { node.open = true; }));
    await page.getByPlaceholder("Optional transfer reference").fill("Partial payment for breakfast");
    const geometry = await page.evaluate(() => {
      const overflow = [...document.querySelectorAll("input,select,textarea,button,summary,.bill-payment-select-row")]
        .filter(el => el.getClientRects().length)
        .filter(el => { const rect = el.getBoundingClientRect(); return rect.left < -1 || rect.right > innerWidth + 1; })
        .map(el => `${el.tagName}.${el.className}`);
      const action = document.querySelector(".bill-payment-allocator-footer .settlement-action-wrap");
      return { overflow, actionWidth: action?.getBoundingClientRect().width ?? 0,
        overviewVisible: Boolean(document.querySelector("section.home-trip-overview")?.getBoundingClientRect().height) };
    });
    results.push({ width, ...geometry });
    await page.screenshot({ path: `test-results/pwa-${width}.png`, fullPage: true });
    await page.close();
  }
} finally { await browser.close(); }
writeFileSync("test-results/pwa-geometry.json", JSON.stringify(results, null, 2));
if (results.some(row => row.overflow.length || row.actionWidth < 240 || !row.overviewVisible)) {
  throw new Error("PWA fixture geometry failed; inspect test-results/pwa-geometry.json and screenshots.");
}
console.log("Static fixture geometry passed at all five widths. Installed-device and live-data tests are separate.");
