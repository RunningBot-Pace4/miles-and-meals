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

async function expectContained(page: Page) {
  const result = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    controls: [...document.querySelectorAll("input,select,textarea,button")].filter((element) => {
      const box = element.getBoundingClientRect();
      return box.width > 0 && (box.left < -1 || box.right > document.documentElement.clientWidth + 1);
    }).length,
  }));
  expect(result.document, "no horizontal overflow in document").toBeLessThanOrEqual(result.viewport + 1);
  expect(result.body, "no horizontal overflow in body").toBeLessThanOrEqual(result.viewport + 1);
  expect(result.controls, "no control extends outside the viewport").toBe(0);
}

const routes = [
  "/companion",
  "/documents",
  "/memories",
  "/settings/permissions",
  "/planner",
  "/offline",
  "/expenses/new",
  "/settlements",
  "/more",
];

for (const width of [320, 360, 375, 390, 412, 430]) {
  test(`v90 workspaces have no horizontal overflow at ${width}px`, async ({ page }) => {
    test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD for authenticated mobile QA.");
    await page.setViewportSize({ width, height: 880 });
    await signIn(page);
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator("main#main-content")).toBeVisible();
      await expectContained(page);
    }
  });
}
