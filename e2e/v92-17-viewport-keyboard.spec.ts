import { expect, test } from "@playwright/test";

const phoneWidths = [320, 360, 390, 430, 600, 719];

for (const width of phoneWidths) {
  test(`V92.17 expense editing stays fitted at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.setContent(`
      <main class="page-container">
        <form class="expense-editor">
          <section class="expense-section fx-section">
            <label>Exchange rate<input aria-label="Exchange rate" inputmode="decimal" value="0.0001579"></label>
          </section>
          <div class="sticky-save"><div class="save-total"><span>Total</span><strong>MYR 0.00</strong></div><button class="button primary">Save expense</button></div>
        </form>
      </main>
    `);
    await page.addStyleTag({ path: "src/app/globals.css" });
    await page.addStyleTag({ path: "src/app/v92-living-journey.css" });

    await page.getByLabel("Exchange rate").focus();
    const result = await page.evaluate(() => {
      const input = document.querySelector("input") as HTMLInputElement;
      const save = document.querySelector(".sticky-save") as HTMLElement;
      return {
        viewport: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        inputFontSize: Number.parseFloat(getComputedStyle(input).fontSize),
        savePosition: getComputedStyle(save).position,
      };
    });

    expect(result.scrollWidth).toBeLessThanOrEqual(result.viewport + 1);
    expect(result.inputFontSize).toBeGreaterThanOrEqual(16);
    expect(result.savePosition).toBe("static");
  });
}

test("V92.17 keeps the desktop expense action sticky", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.setContent(`<form class="expense-editor"><input aria-label="Amount"><div class="sticky-save">Save expense</div></form>`);
  await page.addStyleTag({ path: "src/app/globals.css" });
  await page.addStyleTag({ path: "src/app/v92-living-journey.css" });
  await page.getByLabel("Amount").focus();
  await expect(page.locator(".sticky-save")).toHaveCSS("position", "sticky");
});
