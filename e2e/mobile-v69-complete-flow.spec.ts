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
  const size = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(size.scrollWidth).toBeLessThanOrEqual(size.clientWidth + 1);
}

async function expectBottomNavUsable(page: Page) {
  const nav = page.locator('[data-app-mobile-nav="true"]');
  await expect(nav).toBeVisible();
  const box = await nav.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  if (box && viewport) {
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 2);
    expect(box.width).toBeGreaterThan(250);
  }
}

const coreRoutes = [
  "/dashboard",
  "/planner",
  "/expenses/new",
  "/location",
  "/more",
  "/expenses",
  "/settlements",
  "/trips",
  "/notifications",
  "/activity",
  "/search",
  "/wrapped",
  "/export",
  "/settings/budgets",
  "/settings/profile",
  "/settings/password",
  "/settings/notifications",
  "/journeys",
  "/inbox",
  "/offline",
];

for (const viewport of [
  { width: 320, height: 700, label: "320px compact phone" },
  { width: 360, height: 800, label: "360px Android phone" },
  { width: 375, height: 812, label: "375px iPhone" },
  { width: 390, height: 844, label: "390px modern iPhone" },
  { width: 430, height: 932, label: "430px large phone" },
]) {
  test.describe(`v69 mobile flow · ${viewport.label}`, () => {
    test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD to run authenticated mobile flow tests.");

    test("all core user screens fit the viewport and retain bottom navigation", async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await signIn(page);

      for (const path of coreRoutes) {
        await page.goto(path);
        await expect(page.locator("main#main-content")).toBeVisible();
        await expectNoOverflow(page);
        await expectBottomNavUsable(page);
      }
    });
  });
}

test.describe("v69 navigation behaviour", () => {
  test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD to run authenticated navigation tests.");

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page);
  });

  test("primary tabs stay clean while secondary pages get a back control", async ({ page }) => {
    for (const path of ["/dashboard", "/planner", "/expenses/new", "/location", "/more"]) {
      await page.goto(path);
      await expect(page.getByRole("button", { name: "Go back" })).toHaveCount(0);
    }

    for (const path of ["/expenses", "/settlements", "/trips", "/search", "/wrapped"]) {
      await page.goto(path);
      await expect(page.getByRole("button", { name: "Go back" })).toBeVisible();
    }
  });

  test("search does not steal focus and hide the mobile tool bar", async ({ page }) => {
    await page.goto("/search");
    const search = page.getByRole("searchbox", { name: /search across your trips/i });
    await expect(search).toBeVisible();
    await expect(search).not.toBeFocused();
    await expectBottomNavUsable(page);
  });

  test("Trip Wrapped has instant selection with no extra View button", async ({ page }) => {
    await page.goto("/wrapped");
    await expect(page.getByLabel("Choose trip story")).toBeVisible();
    await expect(page.getByRole("button", { name: /^view$/i })).toHaveCount(0);
  });

  test("Settle Up loads directly from the trip dropdown", async ({ page }) => {
    await page.goto("/settlements");
    await expect(page.getByLabel("Choose settlement trip")).toBeVisible();
    await expect(page.getByRole("button", { name: /view trip/i })).toHaveCount(0);
    await expect(page.getByText(/load its balances immediately/i)).toBeVisible();
  });
});
