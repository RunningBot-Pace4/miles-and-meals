import { expect, test } from "@playwright/test";

const phoneWidths = [320, 360, 390, 430, 600, 719];

for (const width of phoneWidths) {
  test(`V92.19 payer controls stay fitted at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.setContent(`
      <main class="expense-editor" style="width:100%;max-width:680px;margin:auto;padding:16px">
        <section class="expense-section people-section">
          <div class="split-heading-row payer-heading-row">
            <span class="field-label">Paid by</span>
            <div class="mini-segments"><button class="mini-segment active">One payer</button><button class="mini-segment">Multiple payers</button></div>
          </div>
          <div class="single-payer-list">
            <button class="payer-choice-row selected"><span class="avatar">J</span><span class="member-copy"><strong>Juehua</strong><small>Selected payer</small></span><span class="round-check checked">✓</span></button>
            <button class="payer-choice-row"><span class="avatar">P</span><span class="member-copy"><strong>Parent</strong><small>Choose as payer</small></span><span class="round-check"></span></button>
          </div>
          <div class="multi-payer-list">
            <div class="multi-payer-row selected">
              <button class="member-select"><span class="avatar">J</span><span class="member-copy"><strong>Juehua</strong><small>Contributed</small></span><span class="round-check checked">✓</span></button>
              <label class="payer-amount-input"><span>MYR</span><input aria-label="Juehua paid amount" value="52.00"></label>
            </div>
          </div>
          <div class="split-heading-row">
            <span class="field-label">Split with</span>
            <div class="mini-segments split-methods"><button class="mini-segment active">Equal</button><button class="mini-segment">%</button><button class="mini-segment">Shares</button><button class="mini-segment">Exact</button></div>
          </div>
        </section>
      </main>
    `);
    await page.addStyleTag({ path: "src/app/globals.css" });
    await page.addStyleTag({ path: "src/app/living-journey.css" });
    await page.addStyleTag({ path: "src/app/v92-living-journey.css" });

    const metrics = await page.evaluate(() => {
      const onePayerRows = [...document.querySelectorAll<HTMLElement>(".payer-choice-row")];
      const splitButtons = [...document.querySelectorAll<HTMLElement>(".split-methods button")];
      const amount = document.querySelector<HTMLElement>(".payer-amount-input");
      const currency = document.querySelector<HTMLElement>(".payer-amount-input > span");
      const input = document.querySelector<HTMLElement>(".payer-amount-input input");
      return {
        viewport: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
        rowHeights: onePayerRows.map((row) => row.getBoundingClientRect().height),
        splitTops: splitButtons.map((button) => Math.round(button.getBoundingClientRect().top)),
        amountWidth: amount?.getBoundingClientRect().width ?? 0,
        currencyWidth: currency?.getBoundingClientRect().width ?? 0,
        inputWidth: input?.getBoundingClientRect().width ?? 0,
      };
    });

    expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewport + 1);
    // single payer rows stay compact
    expect(Math.max(...metrics.rowHeights)).toBeLessThanOrEqual(70);
    // four split modes stay on one line
    expect(new Set(metrics.splitTops).size).toBe(1);
    // selected multiple-payer amount stays usable
    expect(metrics.amountWidth).toBeGreaterThan(110);
    expect(metrics.currencyWidth).toBeGreaterThan(38);
    expect(metrics.inputWidth).toBeGreaterThan(60);
  });
}
