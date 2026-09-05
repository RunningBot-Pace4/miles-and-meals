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
  const measurements = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth,
  }));

  expect(measurements.page).toBeLessThanOrEqual(measurements.viewport + 1);
}

test.describe("v67 mobile launch-candidate journey", () => {
  test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD to run authenticated launch checks.");

  test("core pages remain usable without horizontal overflow", async ({ page }) => {
    await signIn(page);

    for (const path of [
      "/dashboard",
      "/planner",
      "/expenses",
      "/settlements",
      "/trips",
      "/activity",
      "/search",
    ]) {
      await page.goto(path);
      await expect(page.locator("main#main-content")).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  });

  test("keyboard users can skip directly to app content", async ({ page }) => {
    await signIn(page);
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: /skip to main content/i });
    await expect(skip).toBeFocused();
    await skip.click();
    await expect(page.locator("#main-content")).toBeVisible();
  });

  test("settlement page exposes a clear financial checkpoint", async ({ page }) => {
    await signIn(page);
    await page.goto("/settlements");
    await expect(page.getByText(/Financial checkpoint/i)).toBeVisible();
    await expect(page.getByText(/is open|is closed · expenses are locked/i)).toBeVisible();
  });
});
