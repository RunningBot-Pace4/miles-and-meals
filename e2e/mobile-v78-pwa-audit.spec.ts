import { expect, test, type Page } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email ?? "");
  await page.getByLabel(/password/i).fill(password ?? "");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard/);
}

async function expectNoHorizontalOverflow(page: Page) {
  const geometry = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(geometry.document).toBeLessThanOrEqual(geometry.viewport + 1);
  expect(geometry.body).toBeLessThanOrEqual(geometry.viewport + 1);
}

const pwaRoutes = [
  "/dashboard",
  "/planner",
  "/expenses",
  "/expenses/new",
  "/settlements",
  "/trips",
  "/journeys",
  "/inbox",
  "/offline",
  "/location",
  "/notifications",
  "/search",
  "/wrapped",
  "/more",
  "/settings/budgets",
  "/settings/profile",
  "/settings/notifications",
];

for (const viewport of [
  { width: 320, height: 700, label: "320 compact" },
  { width: 360, height: 780, label: "360 Android" },
  { width: 375, height: 812, label: "375 iPhone" },
  { width: 390, height: 844, label: "390 iPhone" },
  { width: 412, height: 915, label: "412 Android" },
  { width: 430, height: 932, label: "430 large phone" },
]) {
  test.describe(`v78 PWA layout · ${viewport.label}`, () => {
    test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD for authenticated mobile audit.");

    test("core PWA screens do not overflow horizontally", async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await signIn(page);

      for (const route of pwaRoutes) {
        await page.goto(route);
        await expect(page.locator("main#main-content")).toBeVisible();
        await expect(page.locator(".mobile-nav")).toBeVisible();
        await expectNoHorizontalOverflow(page);

        const formFontSizes = await page.locator("input:visible, select:visible, textarea:visible").evaluateAll(
          (elements) => elements.map((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
        );
        for (const size of formFontSizes) {
          expect(size).toBeGreaterThanOrEqual(16);
        }
      }
    });
  });
}

test.describe("v78 interaction upgrades", () => {
  test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD for authenticated interaction audit.");

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page);
  });

  test("Settle Up trip selector has no extra View trip button", async ({ page }) => {
    await page.goto("/settlements");
    await expect(page.getByLabel("Choose settlement trip")).toBeVisible();
    await expect(page.getByRole("button", { name: /^view trip$/i })).toHaveCount(0);
  });

  test("trip date range explains two-tap selection", async ({ page }) => {
    await page.goto("/trips");
    const trigger = page.getByRole("button", { name: /trip dates/i }).first();
    await expect(trigger).toBeVisible();
    await trigger.click();
    const calendar = page.getByRole("dialog", { name: /trip dates calendar/i });
    await expect(calendar).toBeVisible();
    await expect(page.getByText(/choose the start date/i)).toBeVisible();

    const enabledDays = calendar.locator(".date-range-day:not([disabled])");
    if ((await enabledDays.count()) >= 2) {
      await enabledDays.nth(7).click();
      await expect(page.getByText(/now choose the end date/i)).toBeVisible();
      await enabledDays.nth(10).click();
      await expect(calendar).toBeHidden();
    }
  });

  test("Trip Inbox explains flight-number and booking-number privacy", async ({ page }) => {
    await page.goto("/inbox");
    await expect(page.getByText(/flight number vs booking number/i)).toBeVisible();
    await expect(page.getByText(/cannot securely retrieve a private airline reservation/i)).toBeVisible();
  });
});
