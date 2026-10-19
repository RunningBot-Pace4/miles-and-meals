import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
const state = vi.hoisted(() => ({ rows: [] as any[], from: "jy", to: "", amount: 30, close: 0, access: true }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/lib/session", () => ({ getSession: async () => ({ user: { id: "jy", name: "JY" } }) }));
vi.mock("@/lib/access", () => ({ canAccessCountry: async () => state.access, getCountryWithTrip: async () => ({ tripId: "trip" }) }));
vi.mock("@/lib/activity", () => ({ recordActivity: vi.fn() }));
vi.mock("@/lib/push", () => ({ sendPushToUsers: vi.fn() }));
vi.mock("@/lib/settlement-ledger", () => ({ buildCountrySettlementLedger: async () => ({
  tripId: "trip", countryId: "10000000-0000-4000-8000-000000000001", currency: "MYR", pendingSettlements: [], settledSettlements: [],
  waitingTransfers: [{ fromUserId: state.from, toUserId: state.to, amount: state.amount }],
  smartPlan: { originalExpenseBalances: [{ fromUserId: state.from, toUserId: state.to, directRemaining: state.amount, expenses: [{ expenseId: "10000000-0000-4000-8000-000000000004", remainingAmount: state.amount }] }] },
}) }));
vi.mock("@/db/transaction", () => ({ createTransactionalDatabase: () => ({
  database: { transaction: async (callback: (tx: any) => Promise<unknown>) => callback({
    select: () => ({ from: (table: any) => ({ where: () => ({ limit: async () => [], for: async () => getTableName(table) === "trips" ? [{ id: "trip" }] : [] }) }) }),
    insert: (table: any) => ({ values: (row: any) => { state.rows.push({ table: getTableName(table), row }); return { returning: async () => [{ id: row.id }], then: (resolve: any) => Promise.resolve().then(resolve) }; } }),
  }) }, close: async () => { state.close++; },
}) }));
import { POST } from "@/app/api/settlements/route";
const countryId = "10000000-0000-4000-8000-000000000001";
const guest = `guest:${countryId}:10000000-0000-4000-8000-000000000002`;
const post = (action = "MARK_PAID", amount = 30, counterpartyUserId = guest) => POST(new Request("https://app.test/api/settlements", { method: "POST", headers: { origin: "https://app.test", "content-type": "application/json" }, body: JSON.stringify({ countryId, requestId: "10000000-0000-4000-8000-000000000003", counterpartyUserId, action, amount }) }));
beforeEach(() => Object.assign(state, { rows: [], from: "jy", to: guest, amount: 30, close: 0, access: true }));
describe("manually recorded guest payments", () => {
  it("records money paid to a guest as completed by the app payer, without waiting for a nonexistent account", async () => {
    const response = await post(); expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "SETTLED", guestRecorded: true });
    expect(state.rows[0].row).toMatchObject({ fromUserId: "jy", toUserId: guest, status: "SETTLED", amount: "30.00", confirmedBy: "jy" });
    expect(state.rows[0].row.confirmedAt).toBeInstanceOf(Date);
    expect(state.close).toBe(1);
  });
  it("records receipt from a guest separately against that guest's balance", async () => {
    state.from = guest; state.to = "jy";
    const response = await post("MARK_RECEIVED", 10);
    expect(response.status).toBe(200);
    expect(state.rows[0].row).toMatchObject({ fromUserId: guest, toUserId: "jy", amount: "10.00", status: "SETTLED", confirmedBy: "jy" });
  });
  it("keeps receiver confirmation required for payments to normal app users", async () => {
    state.to = "jh";
    const response = await post("MARK_PAID", 30, "jh");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "SENT", guestRecorded: false });
    expect(state.rows[0].row.status).toBe("SENT");
    expect(state.rows[0].row.confirmedBy).toBeUndefined();
    expect(state.rows[0].row.confirmedAt).toBeUndefined();
  });
  it("rejects foreign-country access and amounts above the guest's actual outstanding balance", async () => {
    state.access = false; expect((await post()).status).toBe(403);
    state.access = true; expect((await post("MARK_PAID", 31)).status).toBe(400);
    expect(state.rows).toHaveLength(0);
  });
});
