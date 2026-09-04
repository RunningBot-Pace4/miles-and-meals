import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("V92.25 receipt content cannot widen the phone and bottom navigation stays visible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.setContent(`
    <main class="page-container">
      <form class="expense-editor">
        <section class="receipt-inline-panel">
          <div class="receipt-detected-grid">
            <div><strong>DOZO-PLATINUM-ARENA-SDN-BHD-1523338-X-WITH-AN-UNBROKEN-OCR-LABEL</strong></div>
          </div>
          <details class="receipt-ocr-text" open><pre>UNBROKEN_OCR_TEXT_${"X".repeat(180)}</pre></details>
        </section>
      </form>
    </main>
    <nav class="mobile-nav" data-app-mobile-nav="true"><a class="nav-item">Home</a><a class="nav-item">Plan</a><a class="nav-item nav-action">Add</a><a class="nav-item">Map</a><a class="nav-item">More</a></nav>
  `);
  await page.addStyleTag({ content: readFileSync("src/app/globals.css", "utf8") });
  await page.addStyleTag({ content: readFileSync("src/app/v92-living-journey.css", "utf8") });

  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  const nav = page.locator('[data-app-mobile-nav="true"]');
  await expect(nav).toBeVisible();
  await expect(nav).toHaveCSS("position", "fixed");
  expect((await nav.boundingBox())?.width).toBeLessThanOrEqual(390);
});

