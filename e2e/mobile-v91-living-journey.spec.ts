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
  }));
  expect(result.document, "no horizontal overflow in document").toBeLessThanOrEqual(result.viewport + 1);
  expect(result.body, "no horizontal overflow in body").toBeLessThanOrEqual(result.viewport + 1);
}

for (const width of [320, 360, 390, 430]) {
  test(`Living Journey remains interactive and contained at ${width}px`, async ({ page }) => {
    test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD for authenticated mobile QA.");
    await page.setViewportSize({ width, height: 880 });
    await signIn(page);
    const halo = page.getByRole("tablist", { name: "Living Journey areas" });
    await expect(halo).toBeVisible();
    for (const mode of ["Move", "Plan", "Spend", "People"]) {
      const tab = page.getByRole("tab", { name: mode });
      await tab.click();
      await expect(tab).toHaveAttribute("aria-selected", "true");
      await expectContained(page);
    }
  });
}
