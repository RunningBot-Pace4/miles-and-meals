import { expect, test } from "@playwright/test";

test("V92.21 uses a single document navigation from login to registration", async ({ page }) => {
  await page.goto("/login");

  const createAccount = page.getByRole("link", { name: "Create account" });
  await expect(createAccount).toHaveAttribute("data-navigation-mode", "document");

  await createAccount.click();
  await page.waitForURL(/\/register(?:\?|$)/);

  const navigationCount = await page.evaluate(
    () => performance.getEntriesByType("navigation").length,
  );

  expect(navigationCount).toBe(1);
  await expect(page.getByText("This page couldn't open")).toHaveCount(0);
});
