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
  const sizes = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(sizes.document, "no horizontal overflow in document").toBeLessThanOrEqual(sizes.viewport + 1);
  expect(sizes.body, "no horizontal overflow in body").toBeLessThanOrEqual(sizes.viewport + 1);
}

for (const width of [320, 360, 390, 430]) {
  test(`V92 light Living Journey is contained at ${width}px`, async ({ page }) => {
    test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD for authenticated PWA QA.");
    await page.setViewportSize({ width, height: 880 });
    await signIn(page);
    const halo = page.getByRole("tablist", { name: "Living Journey areas" });
    await expect(halo).toBeVisible();
    expect(await page.locator("html").evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgb(247, 248, 250)");
    for (const mode of ["Move", "Plan", "Spend", "People"]) {
      const tab = page.getByRole("tab", { name: mode });
      await tab.click();
      await expect(tab).toHaveAttribute("aria-selected", "true");
      await expectContained(page);
    }
  });
}

test("V92 PC design keeps the light sidebar and content contained at 1024px", async ({ page }) => {
  test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD for authenticated PC QA.");
  await page.setViewportSize({ width: 1024, height: 900 });
  await signIn(page);
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
  await expect(page.getByRole("tablist", { name: "Living Journey areas" })).toBeVisible();
  await expectContained(page);
});
