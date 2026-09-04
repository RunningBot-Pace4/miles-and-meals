import { expect, test } from "@playwright/test";

test("V92.24 uses a single client navigation from login to registration", async ({ page }) => {
  await page.goto("/login");

  const createAccount = page.getByRole("link", { name: "Create account" });
  await expect(createAccount).toHaveAttribute("data-navigation-mode", "client");

  await page.evaluate(() => {
    (window as Window & { __mnmClientNavigationProbe?: string })
      .__mnmClientNavigationProbe = "alive";
  });

  await createAccount.click();
  await page.waitForURL(/\/register(?:\?|$)/);

  const probe = await page.evaluate(
    () => (window as Window & { __mnmClientNavigationProbe?: string })
      .__mnmClientNavigationProbe,
  );

  expect(probe).toBe("alive");
  await expect(page.getByText("This page couldn't open")).toHaveCount(0);
});
