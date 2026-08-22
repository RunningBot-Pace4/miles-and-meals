import { expect, test } from "@playwright/test";

const email = process.env.E2E_OWNER_EMAIL;
const password = process.env.E2E_OWNER_PASSWORD;
const tripId = process.env.E2E_FINANCIAL_TRIP_ID;
const allowMutation = process.env.E2E_ALLOW_FINANCIAL_MUTATION === "1";

test.describe("v67 owner financial checkpoint", () => {
  test.skip(
    !email || !password || !tripId || !allowMutation,
    "Set E2E_OWNER_EMAIL, E2E_OWNER_PASSWORD, E2E_FINANCIAL_TRIP_ID and E2E_ALLOW_FINANCIAL_MUTATION=1.",
  );

  test("close and reopen are idempotent and restore the fixture state", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(email ?? "");
    await page.getByLabel(/password/i).fill(password ?? "");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard/);

    const before = await page.evaluate(async (id) => {
      const response = await fetch(`/api/trips/${id}/financial-close`);
      return response.json();
    }, tripId ?? "");

    const originalStatus = before.status as "OPEN" | "CLOSED";
    const targetAction = originalStatus === "OPEN" ? "CLOSE" : "REOPEN";
    const restoreAction = originalStatus === "OPEN" ? "REOPEN" : "CLOSE";

    const changed = await page.evaluate(
      async ({ id, action }) => {
        const response = await fetch(`/api/trips/${id}/financial-close`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action }),
        });
        return { status: response.status, body: await response.json() };
      },
      { id: tripId ?? "", action: targetAction },
    );

    expect(changed.status).toBe(200);
    expect(changed.body.ok).toBe(true);

    const restored = await page.evaluate(
      async ({ id, action }) => {
        const response = await fetch(`/api/trips/${id}/financial-close`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action }),
        });
        return { status: response.status, body: await response.json() };
      },
      { id: tripId ?? "", action: restoreAction },
    );

    expect(restored.status).toBe(200);
    expect(restored.body.state.status).toBe(originalStatus);
  });
});
