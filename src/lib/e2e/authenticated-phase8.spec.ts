import {
  expect,
  test,
} from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.describe("authenticated Phase 8", () => {
  test.skip(
    !email || !password,
    "Set E2E_EMAIL and E2E_PASSWORD to run authenticated tests.",
  );

  test("dashboard exposes Phase 8 pull-to-refresh shell", async ({
    page,
  }) => {
    await page.goto("/login");

    await page
      .getByLabel(/email/i)
      .fill(email ?? "");
    await page
      .getByLabel(/password/i)
      .fill(password ?? "");
    await page
      .getByRole("button", {
        name: /sign in/i,
      })
      .click();

    await page.waitForURL(
      /\/dashboard/,
    );

    await expect(
      page.locator(".pull-refresh-indicator"),
    ).toHaveCount(1);
  });

  test("Phase 8 pages are reachable", async ({
    page,
  }) => {
    await page.goto("/login");

    await page
      .getByLabel(/email/i)
      .fill(email ?? "");
    await page
      .getByLabel(/password/i)
      .fill(password ?? "");
    await page
      .getByRole("button", {
        name: /sign in/i,
      })
      .click();

    await page.waitForURL(
      /\/dashboard/,
    );

    for (const path of [
      "/activity",
      "/export",
      "/settings/notifications",
    ]) {
      await page.goto(path);
      await expect(page.locator("h1")).toBeVisible();
    }
  });
});
