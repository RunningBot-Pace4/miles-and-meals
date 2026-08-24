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

async function expectNoOverflow(page: Page) {
  const widths = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client + 1);
}

test.describe("v78 requested UX", () => {
  test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD to run authenticated v78 tests.");

  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("trip dates use one click-twice range calendar", async ({ page }) => {
    await page.goto("/trips");
    const create = page.locator(".owner-create-trip");
    await create.locator(".date-range-trigger").click();

    const now = new Date();
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    await create.locator(`button[data-date="${prefix}-05"]`).click();
    await expect(create.locator('input[name="startDate"]')).toHaveValue(`${prefix}-05`);
    await expect(create.getByText(/Now tap the last day/i)).toBeVisible();

    await create.locator(`button[data-date="${prefix}-09"]`).click();
    await expect(create.locator('input[name="endDate"]')).toHaveValue(`${prefix}-09`);
    await expect(create.locator(".date-range-popover")).toHaveCount(0);
  });

  test("Trip Inbox explains that a reference alone cannot open a private booking", async ({ page }) => {
    await page.goto("/inbox");
    await expect(page.getByText(/Use the full confirmation, not only the number/i)).toBeVisible();
    await expect(page.getByText(/cannot open a private airline or hotel record/i)).toBeVisible();
  });

  for (const viewport of [
    { width: 768, height: 1024, label: "tablet portrait" },
    { width: 1024, height: 768, label: "tablet landscape" },
    { width: 1366, height: 900, label: "desktop" },
  ]) {
    test(`${viewport.label} has no horizontal overflow on the new PWA screens`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      for (const route of ["/journeys", "/inbox", "/offline", "/trips", "/settlements"]) {
        await page.goto(route);
        await expect(page.locator("main#main-content")).toBeVisible();
        await expectNoOverflow(page);
      }
    });
  }
});
