import { expect, test } from "@playwright/test";

const phoneWidths = [320, 360, 390, 430, 600, 719];

for (const width of phoneWidths) {
  test(`V92.18 expense canvas cannot pan horizontally at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.setContent(`
      <div class="app-shell">
        <main class="page-container">
          <form class="expense-editor">
            <header class="expense-editor-hero">
              <div class="expense-editor-title"><p class="eyebrow">EXPENSE</p><h1>Add a spend</h1><p>Record it quickly, split it fairly, keep the trip moving.</p></div>
              <label class="expense-scan-action"><span class="expense-scan-icon"></span><span class="expense-scan-copy"><strong>Scan receipt</strong><small>Take a photo or choose one</small></span><span class="expense-scan-chevron">›</span></label>
            </header>
            <section class="expense-section amount-section">
              <div class="section-heading"><span class="section-number">1</span><div><h2>What did you spend?</h2><p>Record the original amount exactly as you paid it.</p></div></div>
              <label>Trip<select aria-label="Trip"><option>Vietnam - Working Trip · Vietnam</option></select></label>
              <label>Date<input aria-label="Date" type="date" value="2026-09-03"></label>
              <div class="category-grid"><button>Meals</button><button>Travel</button><button>Stay</button><button>Shop</button></div>
              <div class="advanced-money-card"><div class="advanced-money-settings"><label>Currency<select><option>VND — Vietnamese dong</option></select></label><div class="advanced-trip-currency">VND</div></div></div>
            </section>
            <section class="expense-section fx-section">
              <div class="segmented-control"><button class="segment active">Default</button><button class="segment">Cash</button><button class="segment">Card</button><button class="segment">Manual</button></div>
            </section>
            <div class="sticky-save"><div class="save-total"><span>Total</span><strong>MYR 0.00</strong></div><button class="button primary save-expense-button">Save expense</button></div>
          </form>
        </main>
      </div>
    `);
    await page.addStyleTag({ path: "src/app/globals.css" });
    await page.addStyleTag({ path: "src/app/living-journey.css" });
    await page.addStyleTag({ path: "src/app/v92-living-journey.css" });

    const before = await page.evaluate(() => {
      const save = document.querySelector(".sticky-save") as HTMLElement;
      const hero = document.querySelector(".expense-editor-hero") as HTMLElement;
      const segment = document.querySelector(".segmented-control") as HTMLElement;
      window.scrollTo(120, 0);
      return {
        viewport: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        scrollX: window.scrollX,
        savePosition: getComputedStyle(save).position,
        heroRight: hero.getBoundingClientRect().right,
        segmentRight: segment.getBoundingClientRect().right,
      };
    });

    expect(before.documentWidth).toBeLessThanOrEqual(before.viewport + 1);
    expect(before.bodyWidth).toBeLessThanOrEqual(before.viewport + 1);
    expect(before.scrollX).toBe(0);
    expect(before.savePosition).toBe("static");
    expect(before.heroRight).toBeLessThanOrEqual(before.viewport + 1);
    expect(before.segmentRight).toBeLessThanOrEqual(before.viewport + 1);

    await page.getByLabel("Date").focus();
    const afterFocus = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
      savePosition: getComputedStyle(document.querySelector(".sticky-save") as HTMLElement).position,
    }));
    expect(afterFocus.documentWidth).toBeLessThanOrEqual(afterFocus.viewport + 1);
    expect(afterFocus.savePosition).toBe("static");
  });
}

test("V92.18 retains the useful desktop Save action", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.setContent('<form class="expense-editor"><div class="sticky-save">Save expense</div></form>');
  await page.addStyleTag({ path: "src/app/globals.css" });
  await page.addStyleTag({ path: "src/app/v92-living-journey.css" });
  await expect(page.locator(".sticky-save")).toHaveCSS("position", "sticky");
});
