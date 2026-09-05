import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const styles = [
  readFileSync("src/app/globals.css", "utf8"),
  readFileSync("src/app/living-journey.css", "utf8"),
  readFileSync("src/app/v92-living-journey.css", "utf8"),
].join("\n");

const header = `
  <main class="page-container">
    <div class="dashboard-page">
      <section class="dashboard-welcome journey-greeting journey-greeting--upcoming">
        <div class="journey-greeting-route-art" aria-hidden="true">
          <svg viewBox="0 0 240 120" fill="none">
            <path d="M18 88C58 40 94 102 132 61C164 27 188 44 222 20"></path>
            <circle cx="18" cy="88" r="6"></circle>
            <circle cx="222" cy="20" r="8"></circle>
            <path d="m215 20 7-7 7 7-7 12-7-12Z"></path>
          </svg>
        </div>
        <div class="dashboard-welcome-copy">
          <p class="journey-greeting-meta">
            <span class="journey-greeting-status"><i></i>THE COUNTDOWN IS ON</span>
            <span class="journey-greeting-person">For JY</span>
          </p>
          <h1 class="dashboard-welcome-title">Vietnam is getting closer.</h1>
          <p class="journey-greeting-subtitle">JY, your trip starts in 18 days. Your plan, spending and travel crew are ready here.</p>
          <div class="journey-greeting-footer">
            <div class="journey-greeting-details" aria-label="Journey summary">
              <span class="journey-greeting-detail">
                <svg viewBox="0 0 24 24"></svg>
                <span><small>Travel dates</small><strong>22 Sep 2026 – 28 Sep 2026</strong></span>
              </span>
              <span class="journey-greeting-detail">
                <svg viewBox="0 0 24 24"></svg>
                <span><small>Destination</small><strong>Vietnam</strong></span>
              </span>
            </div>
            <a class="button primary dashboard-add" href="#">＋ Add expense</a>
          </div>
        </div>
      </section>
    </div>
  </main>`;

test("V92.24 Home journey header fits phone, tablet and desktop widths", async ({ page }) => {
  for (const width of [320, 360, 390, 430, 719, 768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.setContent(`<style>${styles}</style>${header}`);

    const geometry = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      sectionWidth: document.querySelector(".journey-greeting")?.getBoundingClientRect().width ?? 0,
      actionWidth: document.querySelector(".dashboard-add")?.getBoundingClientRect().width ?? 0,
      columns: getComputedStyle(document.querySelector(".journey-greeting-details")!).gridTemplateColumns,
    }));

    expect(geometry.scrollWidth, `${width}px page overflow`).toBeLessThanOrEqual(geometry.clientWidth);
    expect(geometry.sectionWidth).toBeLessThanOrEqual(width);
    expect(geometry.actionWidth).toBeGreaterThan(0);

    if (width <= 360) {
      expect(geometry.columns.trim().split(/\s+/)).toHaveLength(1);
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.setContent(`<style>${styles}</style>${header}`);
  await page.screenshot({
    path: "test-results/v92-24-home-header-390.png",
    fullPage: true,
  });
});
