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

test.describe("v70 explainable Smart Settlement", () => {
  test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD to run authenticated settlement audit tests.");

  test("audit views stay usable on a mobile viewport when Smart Settlement data exists", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page);
    await page.goto("/settlements");

    const panel = page.locator(".smart-settlement-panel");
    if ((await panel.count()) === 0) {
      test.skip(true, "The selected test trip has no settlement data to audit.");
    }

    await expect(page.getByRole("button", { name: /Smart Settlement/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Original Balances/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^History/i })).toBeVisible();

    await page.getByRole("button", { name: /Original Balances/i }).click();
    await expect(page.getByText(/Who originally owes whom/i)).toBeVisible();

    await page.getByRole("button", { name: /^History/i }).click();
    await expect(page.getByText(/Payments already recorded/i)).toBeVisible();

    await page.getByRole("button", { name: /Smart Settlement/i }).click();
    const details = page.getByText("View details", { exact: true });
    if ((await details.count()) > 0) {
      await details.first().click();
      await expect(page.getByText(/See how this was calculated/i).first()).toBeVisible();
      await expect(page.getByText(/Expenses behind these net positions/i).first()).toBeVisible();
    }
  });
});
