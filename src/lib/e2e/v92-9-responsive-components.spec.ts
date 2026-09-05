import { expect, test } from "@playwright/test";

const widths = [320, 360, 390, 430];

for (const width of widths) {
  test(`V92.9 calendar and settlement stay usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.setContent(`
      <main class="page-container">
        <section class="panel settlement-panel">
          <div class="panel-title"><div><p class="eyebrow">CURRENT STATUS</p><h2>Waiting & payment sent</h2></div></div>
          <div class="settlement-status-list">
            <article class="settlement-status-row waiting">
              <div class="settlement-status-icon">○</div>
              <div class="settlement-status-copy"><strong>You → JY</strong><small>Vietnam · Working Trip · Waiting for payment</small></div>
              <strong class="settlement-amount">RM 30.53</strong>
              <div class="settlement-action-wrap">
                <label class="settlement-partial-amount">
                  <span>Amount</span>
                  <span><b>MYR</b><input value="30.53" /></span>
                  <small>Enter the full or partial amount received/paid.</small>
                </label>
                <button class="button settlement-action-button">Mark paid</button>
              </div>
            </article>
          </div>
        </section>
        <div class="date-range-picker">
          <span class="date-range-label">Travel dates</span>
          <button class="date-range-trigger" aria-expanded="true">
            <span class="date-range-value filled"><small>Start</small><strong>5 Sep 2026</strong></span>
            <span class="date-range-arrow">→</span>
            <span class="date-range-value filled"><small>End</small><strong>9 Sep 2026</strong></span>
            <span class="date-range-calendar-icon">□</span>
          </button>
          <section class="date-range-popover">
            <div class="date-range-popover-head"><button>‹</button><div><strong>September 2026</strong><small>Choose the start date</small></div><button>›</button></div>
            <div class="date-range-instruction"><span class="done"><b>✓</b> Start</span><span>→</span><span class="active"><b>2</b> End</span><small>Tap the final day</small></div>
            <div class="date-range-weekdays">${["M","T","W","T","F","S","S"].map((day) => `<span>${day}</span>`).join("")}</div>
            <div class="date-range-grid">${Array.from({ length: 42 }, (_, index) => `<button class="date-range-day${index === 4 ? " selected" : index > 4 && index < 8 ? " in-range" : ""}">${index + 1}</button>`).join("")}</div>
          </section>
        </div>
      </main>
    `);
    await page.addStyleTag({ path: "src/app/globals.css" });
    await page.addStyleTag({ path: "src/app/v92-living-journey.css" });

    const result = await page.evaluate(() => {
      const row = document.querySelector(".settlement-status-row")!.getBoundingClientRect();
      const action = document.querySelector(".settlement-action-wrap")!.getBoundingClientRect();
      const amountLabel = document.querySelector(".settlement-partial-amount > span:first-child")!.getBoundingClientRect();
      const button = document.querySelector(".settlement-action-button")!.getBoundingClientRect();
      const calendar = document.querySelector(".date-range-popover")!.getBoundingClientRect();
      return {
        viewport: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        rowWidth: row.width,
        actionWidth: action.width,
        amountLabelWidth: amountLabel.width,
        buttonWidth: button.width,
        calendarLeft: calendar.left,
        calendarRight: calendar.right,
      };
    });

    expect(result.scrollWidth).toBeLessThanOrEqual(result.viewport + 1);
    expect(result.actionWidth).toBeGreaterThan(result.rowWidth * 0.85);
    expect(result.amountLabelWidth).toBeGreaterThan(100);
    expect(result.buttonWidth).toBeGreaterThan(result.rowWidth * 0.85);
    expect(result.calendarLeft).toBeGreaterThanOrEqual(0);
    expect(result.calendarRight).toBeLessThanOrEqual(result.viewport + 1);
  });
}
