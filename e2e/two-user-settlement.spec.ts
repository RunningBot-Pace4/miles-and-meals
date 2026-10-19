import { expect, test, type BrowserContext, type Page, type Response } from "@playwright/test";
import type { SettlementLiveData } from "../src/lib/settlement-live";

// This test writes payment records. Run only against a disposable preview fixture.
const enabled = process.env.E2E_ALLOW_FINANCIAL_MUTATION === "1";
const env = process.env;
const required = ["E2E_BASE_URL", "E2E_PAYER_EMAIL", "E2E_PAYER_PASSWORD", "E2E_PAYER_USER_ID", "E2E_RECEIVER_EMAIL", "E2E_RECEIVER_PASSWORD", "E2E_RECEIVER_USER_ID", "E2E_TRIP_ID", "E2E_COUNTRY_ID", "E2E_BILL_20_ID", "E2E_BILL_40_ID"] as const;

async function signIn(context: BrowserContext, email: string, password: string) {
  const page = await context.newPage();
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard/);
  const active = await context.request.post("/api/active-trip", {
    headers: { origin: new URL(env.E2E_BASE_URL!).origin }, data: { tripId: env.E2E_TRIP_ID },
  });
  expect(active.ok(), "Select disposable test trip").toBeTruthy();
  await page.goto("/dashboard");
  return page;
}

async function summary(context: BrowserContext): Promise<SettlementLiveData> {
  const response = await context.request.get(`/api/settlements/summary?trip=${encodeURIComponent(env.E2E_TRIP_ID!)}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

function balance(data: SettlementLiveData) {
  const plan = data.smartPlans.find(p => p.countryId === env.E2E_COUNTRY_ID);
  expect(plan, "Fixture country must belong to the selected trip").toBeDefined();
  return plan!.originalExpenseBalances.find(b => b.fromUserId === env.E2E_PAYER_USER_ID && b.toUserId === env.E2E_RECEIVER_USER_ID);
}

async function mutation(page: Page, click: () => Promise<void>) {
  const responsePromise = page.waitForResponse(r => new URL(r.url()).pathname === "/api/settlements" && r.request().method() === "POST");
  await click();
  const response: Response = await responsePromise;
  expect(response.ok(), "Payment action should succeed").toBeTruthy();
  return response.json() as Promise<{ settlementId: string }>;
}

async function reverse(context: BrowserContext, id: string) {
  const response = await context.request.post(`/api/settlements/${encodeURIComponent(id)}/reverse`, {
    headers: { origin: new URL(env.E2E_BASE_URL!).origin },
    data: { reason: "Disposable E2E payment lifecycle check" },
  });
  expect(response.ok(), `Reverse only test-created payment ${id}`).toBeTruthy();
}

test.describe("two-user partial-payment lifecycle", () => {
  test.skip(!enabled, "Requires E2E_ALLOW_FINANCIAL_MUTATION=1 and the disposable fixture in VERIFICATION-GUIDE.md.");
  test("RM20 + RM40: pay RM45, reserve/release RM15, confirm and reverse without reload", async ({ browser }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "Run shared financial fixture once, without parallel browser projects.");
    test.setTimeout(240_000);
    expect(required.filter(key => !env[key]), "Missing test configuration").toEqual([]);
    expect(new URL(env.E2E_BASE_URL!).hostname, "Never run against the real production app").not.toBe("goeatsleep.vercel.app");
    expect(env.E2E_PAYER_USER_ID).not.toBe(env.E2E_RECEIVER_USER_ID);
    expect(env.E2E_BILL_20_ID).not.toBe(env.E2E_BILL_40_ID);

    const payerContext = await browser.newContext({ baseURL: env.E2E_BASE_URL });
    const receiverContext = await browser.newContext({ baseURL: env.E2E_BASE_URL });
    const created = new Set<string>();
    let receiver: Page | undefined;
    try {
      const payer = await signIn(payerContext, env.E2E_PAYER_EMAIL!, env.E2E_PAYER_PASSWORD!);
      receiver = await signIn(receiverContext, env.E2E_RECEIVER_EMAIL!, env.E2E_RECEIVER_PASSWORD!);
      const initial = await summary(payerContext);
      expect(initial.smartPlans).toHaveLength(1);
      const plan = initial.smartPlans[0];
      expect(plan.tripId).toBe(env.E2E_TRIP_ID);
      expect(plan.tripName, "Use a clearly labelled disposable trip").toMatch(/^E2E /);
      expect(plan.currency).toBe("MYR");
      expect(plan.originalExpenseBalances).toHaveLength(1);
      expect(initial.pendingSettlements).toHaveLength(0);
      expect(initial.settledSettlements).toHaveLength(0);
      const due = balance(initial)!;
      expect(due.directRemaining).toBe(60);
      expect(due.expenses).toHaveLength(2);
      const first = due.expenses.find(e => e.expenseId === env.E2E_BILL_20_ID)!;
      const second = due.expenses.find(e => e.expenseId === env.E2E_BILL_40_ID)!;
      expect(first?.remainingAmount).toBe(20);
      expect(second?.remainingAmount).toBe(40);
      expect(first.expenseDate < second.expenseDate, "RM20 receipt must be older for automatic allocation").toBeTruthy();
      expect(balance(await summary(receiverContext))?.directRemaining).toBe(60);

      const card = payer.locator(".home-payment-request").filter({ hasText: plan.tripName });
      await expect(card).toHaveCount(1);
      const amount = card.getByRole("textbox", { name: "Payment amount in MYR", exact: true });
      await expect(amount).toHaveValue("60.00");
      await amount.fill("45.00");
      const details = card.locator("details").filter({ hasText: "Trip · required" });
      await details.locator("summary").click();
      const receipt = card.getByRole("checkbox").filter({ visible: true });
      // Both receipts are deliberately left unselected for oldest-first allocation.
      await expect(receipt).toHaveCount(2);
      await receipt.first().check();
      await expect(details).toHaveAttribute("open", "");
      await receipt.first().uncheck();
      await expect(details).toHaveAttribute("open", "");

      let navigations = 0;
      payer.on("framenavigated", frame => { if (frame === payer.mainFrame()) navigations++; });
      receiver.on("framenavigated", frame => { if (frame === receiver!.mainFrame()) navigations++; });
      const payment = await mutation(payer, () => card.getByRole("button", { name: "Confirm payment sent", exact: true }).click());
      created.add(payment.settlementId);
      await expect(amount).toHaveValue("15.00", { timeout: 30_000 });
      for (const context of [payerContext, receiverContext]) {
        const data = await summary(context);
        const recorded = data.pendingSettlements.find(p => p.id === payment.settlementId)!;
        expect(recorded?.amount).toBe(45);
        expect(recorded.allocations.map(a => ({ expenseId: a.expenseId, amount: a.amount }))).toEqual(expect.arrayContaining([
          { expenseId: first.expenseId, amount: 20 }, { expenseId: second.expenseId, amount: 25 },
        ]));
        expect(recorded.allocations).toHaveLength(2);
        expect(balance(data)?.directRemaining).toBe(15);
        expect(balance(data)?.expenses.find(e => e.expenseId === second.expenseId)?.remainingAmount).toBe(15);
      }
      const receiverCard = receiver.locator(".home-pending-payment").filter({ hasText: plan.tripName }).filter({ hasText: first.description });
      await expect(receiverCard).toHaveCount(1, { timeout: 45_000 });

      // The remaining amount must still be payable while RM45 is pending.
      const remainder = await mutation(payer, () => card.getByRole("button", { name: "Confirm payment sent", exact: true }).click());
      created.add(remainder.settlementId);
      const allSent = await summary(payerContext);
      expect(allSent.pendingSettlements.map(p => p.id).sort()).toEqual([payment.settlementId, remainder.settlementId].sort());
      expect(allSent.pendingSettlements.find(p => p.id === remainder.settlementId)?.amount).toBe(15);
      expect(balance(allSent)?.directRemaining ?? 0).toBe(0);
      await reverse(payerContext, remainder.settlementId);
      created.delete(remainder.settlementId);
      await expect(amount).toHaveValue("15.00", { timeout: 45_000 });
      await expect(payer.locator(".home-pending-payment").filter({ hasText: plan.tripName })).toHaveCount(1, { timeout: 45_000 });
      expect(balance(await summary(receiverContext))?.directRemaining).toBe(15);

      const confirmed = await mutation(receiver, () => receiverCard.getByRole("button", { name: "Confirm received", exact: true }).click());
      expect(confirmed.settlementId).toBe(payment.settlementId);
      await expect(receiverCard).toHaveCount(0, { timeout: 30_000 });
      await expect(payer.locator(".home-pending-payment").filter({ hasText: plan.tripName })).toHaveCount(0, { timeout: 45_000 });
      const received = await summary(payerContext);
      expect(received.settledSettlements.find(p => p.id === payment.settlementId)?.amount).toBe(45);
      expect(balance(received)?.directRemaining).toBe(15);
      await reverse(receiverContext, payment.settlementId);
      created.delete(payment.settlementId);
      await expect(amount).toHaveValue("60.00", { timeout: 45_000 });
      for (const context of [payerContext, receiverContext]) {
        const data = await summary(context);
        expect(balance(data)?.directRemaining).toBe(60);
        expect(data.pendingSettlements).toHaveLength(0);
        expect(data.settledSettlements).toHaveLength(0);
        expect(data.smartPlans[0].recordedPayments.find(p => p.id === payment.settlementId)?.status).toBe("REVERSED");
        expect(data.smartPlans[0].recordedPayments.find(p => p.id === remainder.settlementId)?.status).toBe("CANCELLED");
      }
      expect(navigations, "Both Home screens should update without document navigation").toBe(0);
    } finally {
      // Preserve audit records; undo only records created by this run.
      const cleanup = await Promise.allSettled([...created].map(async id => {
        const data = await summary(payerContext);
        const confirmed = data.settledSettlements.some(p => p.id === id);
        await reverse(confirmed ? receiverContext : payerContext, id);
      }));
      await Promise.all([payerContext.close(), receiverContext.close()]);
      expect(cleanup.filter(result => result.status === "rejected"), "Review any failed test-payment cleanup in the disposable fixture").toEqual([]);
    }
  });
});
