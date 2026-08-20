import {
  expect,
  test,
} from "@playwright/test";

test("login surface loads", async ({ page }) => {
  await page.goto("/login");

  await expect(
    page.getByText("Miles & Meals").first(),
  ).toBeVisible();
});

test("PWA manifest is valid JSON", async ({
  request,
}) => {
  const response = await request.get(
    "/manifest.webmanifest",
  );

  expect(response.ok()).toBeTruthy();

  const manifest = await response.json();

  expect(manifest.name).toBe(
    "Miles & Meals",
  );
  expect(manifest.display).toBe(
    "standalone",
  );
  expect(manifest.icons.length).toBeGreaterThanOrEqual(
    2,
  );
});

test("offline shell is available", async ({
  page,
}) => {
  await page.goto("/offline.html");

  await expect(
    page.getByRole("heading", {
      name: "You’re offline",
    }),
  ).toBeVisible();

  await expect(
    page.getByRole("button", {
      name: "Try again",
    }),
  ).toBeVisible();
});
