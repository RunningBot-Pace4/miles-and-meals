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

async function expectNoHorizontalOverflow(page: Page) {
  const geometry = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(geometry.document).toBeLessThanOrEqual(geometry.viewport + 1);
  expect(geometry.body).toBeLessThanOrEqual(geometry.viewport + 1);
}

async function expectFormControlsInsideViewport(page: Page) {
  const violations = await page
    .locator("input:visible, select:visible, textarea:visible, button:visible")
    .evaluateAll((elements) => {
      const viewport = document.documentElement.clientWidth;
      return elements.flatMap((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return [];
        if (rect.left >= -1 && rect.right <= viewport + 1) return [];
        return [
          {
            tag: element.tagName,
            label:
              element.getAttribute("aria-label") ??
              element.textContent?.trim().slice(0, 60) ??
              "",
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            viewport,
          },
        ];
      });
    });

  expect(violations).toEqual([]);
}

const pwaRoutes = [
  "/dashboard",
  "/planner",
  "/expenses",
  "/expenses/new",
  "/settlements",
  "/trips",
  "/journeys",
  "/offline",
  "/location",
  "/notifications",
  "/activity",
  "/export",
  "/search",
  "/wrapped",
  "/more",
  "/settings/budgets",
  "/settings/profile",
  "/settings/notifications",
  "/settings/password",
];

for (const viewport of [
  { width: 320, height: 700, label: "320 compact" },
  { width: 360, height: 780, label: "360 Android" },
  { width: 375, height: 812, label: "375 iPhone" },
  { width: 390, height: 844, label: "390 iPhone" },
  { width: 412, height: 915, label: "412 Android" },
  { width: 430, height: 932, label: "430 large phone" },
]) {
  test.describe(`v78 PWA layout · ${viewport.label}`, () => {
    test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD for authenticated mobile audit.");

    test("core PWA screens do not overflow horizontally", async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await signIn(page);

      for (const route of pwaRoutes) {
        await page.goto(route);
        await expect(page.locator("main#main-content")).toBeVisible();
        await expect(page.locator(".mobile-nav")).toBeVisible();
        await expectNoHorizontalOverflow(page);
        await expectFormControlsInsideViewport(page);

        const formFontSizes = await page.locator("input:visible, select:visible, textarea:visible").evaluateAll(
          (elements) => elements.map((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
        );
        for (const size of formFontSizes) {
          expect(size).toBeGreaterThanOrEqual(16);
        }
      }
    });
  });
}

test.describe("v78 interaction upgrades", () => {
  test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD for authenticated interaction audit.");

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page);
  });

  test("Settle Up trip selector has no extra View trip button", async ({ page }) => {
    await page.goto("/settlements");
    await expect(page.getByLabel("Choose settlement trip")).toBeVisible();
    await expect(page.getByRole("button", { name: /^view trip$/i })).toHaveCount(0);
  });

  test("trip date range explains two-tap selection", async ({ page }) => {
    await page.goto("/trips");
    const trigger = page.getByRole("button", { name: /trip dates/i }).first();
    await expect(trigger).toBeVisible();
    await trigger.click();
    const calendar = page.getByRole("dialog", { name: /trip dates calendar/i });
    await expect(calendar).toBeVisible();
    await expect(page.getByText(/choose the start date/i)).toBeVisible();
    await expect(calendar.locator(".date-range-day")).toHaveCount(42);

    const calendarBox = await calendar.boundingBox();
    const createButtonBox = await page
      .getByRole("button", { name: /^create trip$/i })
      .boundingBox();
    expect(calendarBox).not.toBeNull();
    expect(createButtonBox).not.toBeNull();
    expect(calendarBox!.x).toBeGreaterThanOrEqual(-1);
    expect(calendarBox!.x + calendarBox!.width).toBeLessThanOrEqual(391);
    expect(calendarBox!.y + calendarBox!.height).toBeLessThanOrEqual(
      createButtonBox!.y + 1,
    );

    const enabledDays = calendar.locator(".date-range-day:not([disabled])");
    if ((await enabledDays.count()) >= 2) {
      await enabledDays.nth(7).click();
      await expect(page.getByText(/now choose the end date/i)).toBeVisible();
      await enabledDays.nth(10).click();
      await expect(calendar).toBeHidden();
    }
  });

  test("long native-select labels stay contained", async ({ page }) => {
    await page.goto("/dashboard");
    const tripSelect = page.getByLabel("Change dashboard trip");
    await expect(tripSelect).toBeVisible();
    await expectFormControlsInsideViewport(page);

    const labels = await tripSelect.locator("option").allTextContents();
    for (const label of labels) {
      expect(label.trim().length).toBeLessThanOrEqual(32);
    }
  });

  test("mobile navigation remains attached to the viewport while Settlement scrolls", async ({ page }) => {
    await page.goto("/settlements");
    await page.waitForFunction(() => document.querySelector(".mobile-nav")?.parentElement === document.body);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(100);

    const geometry = await page.locator(".mobile-nav").evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        position: getComputedStyle(element).position,
        top: rect.top,
        bottom: rect.bottom,
        viewportHeight: window.innerHeight,
      };
    });

    expect(geometry.position).toBe("fixed");
    expect(geometry.top).toBeGreaterThanOrEqual(0);
    expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight + 1);
    expect(geometry.viewportHeight - geometry.bottom).toBeLessThanOrEqual(24);
  });

});

test.describe("v79 tablet and browser-zoom containment", () => {
  test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD for authenticated layout audit.");

  for (const width of [720, 768, 960]) {
    test(`trip calendar stays in-flow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await signIn(page);
      await page.goto("/trips");
      await page.getByRole("button", { name: /trip dates/i }).first().click();

      const calendar = page.getByRole("dialog", { name: /trip dates calendar/i });
      const calendarBox = await calendar.boundingBox();
      const createButtonBox = await page
        .getByRole("button", { name: /^create trip$/i })
        .boundingBox();

      expect(calendarBox).not.toBeNull();
      expect(createButtonBox).not.toBeNull();
      expect(calendarBox!.x).toBeGreaterThanOrEqual(-1);
      expect(calendarBox!.x + calendarBox!.width).toBeLessThanOrEqual(width + 1);
      expect(calendarBox!.y + calendarBox!.height).toBeLessThanOrEqual(
        createButtonBox!.y + 1,
      );
      await expectNoHorizontalOverflow(page);
      await expectFormControlsInsideViewport(page);
    });
  }
});

for (const width of [320, 390, 430]) {
  test(`v81 standalone offline shell contains two saved Trips at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.addInitScript(() => {
      const makePack = (id: string, name: string, destination: string) => ({
        version: 2,
        savedAt: "2026-08-25T04:01:53.000Z",
        currentUserId: "user-1",
        trip: {
          id,
          name,
          destination,
          countryId: `country-${id}`,
          currencyCode: id === "trip-1" ? "VND" : "JPY",
          baseCurrency: "MYR",
          defaultExchangeRate: 0.00016,
          startDate: "2026-08-25",
          endDate: "2026-08-29",
          financialStatus: "OPEN",
        },
        members: [
          { id: "user-1", name: "You" },
          { id: "user-2", name: "Travel Partner" },
        ],
        plan: [],
      });
      localStorage.setItem(
        "mnm:offline-packs:v3",
        JSON.stringify([
          makePack("trip-1", "Vietnam Working With A Very Long Trip Name", "Vietnam"),
          makePack("trip-2", "Japan Autumn Holiday", "Japan"),
          {
            ...makePack("trip-closed", "Closed Holiday", "Thailand"),
            trip: {
              ...makePack("trip-closed", "Closed Holiday", "Thailand").trip,
              financialStatus: "CLOSED",
            },
          },
        ]),
      );
      localStorage.setItem("mnm:offline-selected-trip:v1", "trip-1");
    });

    await page.goto("/offline.html");
    await expect(page.locator("#saved-trip option")).toHaveCount(2);
    await expect(page.locator("#saved-trip option", { hasText: "Closed Holiday" })).toHaveCount(0);
    await expect(page.locator("#share-members input")).toHaveCount(2);
    await expectNoHorizontalOverflow(page);
    await expectFormControlsInsideViewport(page);

    const gridColumns = await page.locator("#quick-form .grid").first().evaluate(
      (element) => getComputedStyle(element).gridTemplateColumns.split(" ").length,
    );
    expect(gridColumns).toBe(1);

    await page.locator("#share-me").click();
    await page.locator("#description").fill("Offline lunch");
    await page.locator("#amount").fill("12.50");
    await page.locator("#quick-form button[type='submit']").click();
    const queuedSplitIds = await page.evaluate(() => {
      const queue = JSON.parse(localStorage.getItem("mnm:offline-mutation-queue:v1") ?? "[]") as Array<{
        body?: { splits?: Array<{ userId: string }> };
      }>;
      return queue[0]?.body?.splits?.map((split) => split.userId) ?? [];
    });
    expect(queuedSplitIds).toEqual(["user-1"]);
  });
}
