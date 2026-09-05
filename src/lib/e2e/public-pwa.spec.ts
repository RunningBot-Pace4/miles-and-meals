import {
  expect,
  test,
} from "@playwright/test";

const publicRoutes = [
  "/login",
  "/register",
  "/forgot-password",
  "/offline.html",
];

for (const width of [320, 360, 390, 430, 600, 768, 820, 1024]) {
  test(`public Web/PWA surfaces fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width >= 600 ? 1100 : 880 });

    for (const route of publicRoutes) {
      await page.goto(route);
      const layout = await page.evaluate(() => {
        const viewport = document.documentElement.clientWidth;
        const visible = (element: Element) => {
          const box = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return box.width > 0 && box.height > 0 && style.display !== "none" && style.visibility !== "hidden";
        };
        const escaped = [...document.querySelectorAll("input,select,textarea,button,a,.panel,.card")]
          .filter(visible)
          .filter((element) => {
            const box = element.getBoundingClientRect();
            return box.left < -1 || box.right > viewport + 1;
          })
          .map((element) => `${element.tagName.toLowerCase()}.${element.className}`)
          .slice(0, 10);

        return {
          viewport,
          documentWidth: document.documentElement.scrollWidth,
          bodyWidth: document.body.scrollWidth,
          escaped,
        };
      });

      expect(layout.documentWidth, `${route}: document overflow`).toBeLessThanOrEqual(layout.viewport + 1);
      expect(layout.bodyWidth, `${route}: body overflow`).toBeLessThanOrEqual(layout.viewport + 1);
      expect(layout.escaped, `${route}: visible element outside viewport`).toEqual([]);
    }
  });
}

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
