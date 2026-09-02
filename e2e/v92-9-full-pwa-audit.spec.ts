import { expect, test, type Page } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

const routes = [
  "/dashboard",
  "/planner",
  "/expenses",
  "/expenses/new",
  "/settlements",
  "/location",
  "/offline",
  "/companion",
  "/documents",
  "/memories",
  "/receipts",
  "/trips",
  "/journeys",
  "/wrapped",
  "/notifications",
  "/search",
  "/activity",
  "/export",
  "/settings/profile",
  "/settings/password",
  "/settings/budgets",
  "/settings/permissions",
  "/settings/notifications",
  "/more",
];

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email ?? "");
  await page.getByLabel(/password/i).fill(password ?? "");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard/);
}

async function auditViewport(page: Page, route: string) {
  await page.goto(route);
  await expect(page.locator("main#main-content")).toBeVisible();
  const issues = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    const visible = (element: Element) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return box.width > 0 && box.height > 0 && style.visibility !== "hidden" && style.display !== "none";
    };
    const escaped = [...document.querySelectorAll("main input,main select,main textarea,main button,main .button,main .panel,main .card")]
      .filter(visible)
      .filter((element) => {
        const box = element.getBoundingClientRect();
        return box.left < -1 || box.right > viewport + 1;
      })
      .map((element) => `${element.tagName.toLowerCase()}.${element.className}`)
      .slice(0, 10);
    const narrowTextControls = [...document.querySelectorAll("main button,main .button")]
      .filter(visible)
      .filter((element) => {
        const box = element.getBoundingClientRect();
        return (element.textContent?.trim().length ?? 0) > 4 && box.width < 72;
      })
      .map((element) => element.textContent?.trim() ?? "")
      .slice(0, 10);
    const nativeDates = [...document.querySelectorAll('input[type="date"],input[type="time"],input[type="datetime-local"],input[type="month"]')]
      .filter(visible)
      .filter((element) => element.getBoundingClientRect().height < 44)
      .length;
    return {
      viewport,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      escaped,
      narrowTextControls,
      nativeDates,
    };
  });
  expect(issues.documentWidth, `${route}: document overflow`).toBeLessThanOrEqual(issues.viewport + 1);
  expect(issues.bodyWidth, `${route}: body overflow`).toBeLessThanOrEqual(issues.viewport + 1);
  expect(issues.escaped, `${route}: elements outside viewport`).toEqual([]);
  expect(issues.narrowTextControls, `${route}: text controls collapsed`).toEqual([]);
  expect(issues.nativeDates, `${route}: undersized calendar controls`).toBe(0);
}

for (const width of [320, 360, 390, 430]) {
  test(`V92.9 full PWA page sweep at ${width}px`, async ({ page }) => {
    test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD for the authenticated full-PWA audit.");
    await page.setViewportSize({ width, height: 880 });
    await signIn(page);
    for (const route of routes) await auditViewport(page, route);
  });
}
