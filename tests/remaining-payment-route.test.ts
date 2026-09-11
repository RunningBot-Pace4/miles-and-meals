import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ ledger: {} as any, actor: "payer", inserted: [] as any[], updates: 0 }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/lib/session", () => ({ getSession: async () => ({ user: { id: state.actor, name: "Traveler" } }) }));
vi.mock("@/lib/access", () => ({ canAccessCountry: async () => true, getCountryWithTrip: async () => ({ tripId: "trip" }) }));
vi.mock("@/lib/activity", () => ({ recordActivity: async () => {} }));
vi.mock("@/lib/push", () => ({ sendPushToUsers: async () => {} }));
vi.mock("@/lib/request-security", () => ({ isTrustedMutationRequest: () => true, mutationRejectedResponse: () => new Response(null, { status:403 }) }));
vi.mock("@/lib/settlement-ledger", () => ({ buildCountrySettlementLedger: async () => state.ledger }));
vi.mock("@/db/transaction", () => ({ createTransactionalDatabase: () => ({ close: async () => {}, database: { transaction: async (fn: any) => fn({
  select: () => ({ from: () => ({ where: () => ({ for: async () => [{ id:"trip" }], limit: async () => [] }) }) }),
  insert: () => ({ values: (value: any) => { state.inserted.push(value); return { returning: async () => [{ id:value.id }] }; } }),
  update: () => ({ set: () => ({ where: () => ({ returning: async () => { state.updates++; return [{ id:"confirmed" }]; } }) }) }),
}) } }) }));
import { POST } from "@/app/api/settlements/route";
const countryId = "10000000-0000-4000-8000-000000000001";
const first = "10000000-0000-4000-8000-000000000002";
const second = "10000000-0000-4000-8000-000000000003";
const requestId = "10000000-0000-4000-8000-000000000004";
const call = (body: object) => POST(new Request("https://example.test/api/settlements", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ countryId, requestId, counterpartyUserId:state.actor === "payer" ? "receiver" : "payer", ...body }) }));
beforeEach(() => {
  state.actor="payer"; state.inserted=[]; state.updates=0;
  state.ledger={ tripId:"trip",countryId,currency:"MYR",pendingSettlements:[{id:first,fromUserId:"payer",toUserId:"receiver",amount:20}],settledSettlements:[],waitingTransfers:[{fromUserId:"payer",toUserId:"receiver",amount:30}],smartPlan:{originalExpenseBalances:[]} };
});
describe("remaining payment API", () => {
  it("accepts a second keyed partial payment while RM20 awaits confirmation", async () => {
    const response=await call({action:"MARK_PAID",amount:10});
    expect(response.status).toBe(200);
    expect(state.inserted[0]).toMatchObject({id:requestId,amount:"10.00",status:"SENT"});
  });
  it("rejects a new payment exceeding the balance after pending reservations", async () => {
    expect((await call({action:"MARK_PAID",amount:31})).status).toBe(400);
    expect(state.inserted).toHaveLength(0);
  });
  it("requires a specific payment when multiple payments await confirmation", async () => {
    state.actor="receiver";
    state.ledger.pendingSettlements.push({id:second,fromUserId:"payer",toUserId:"receiver",amount:10});
    expect((await call({action:"MARK_RECEIVED"})).status).toBe(409);
    expect(state.updates).toBe(0);
    expect((await call({action:"MARK_RECEIVED",settlementId:second})).status).toBe(200);
    expect(state.updates).toBe(1);
  });
  it("does not confirm another payment when the selected one was already confirmed", async () => {
    state.actor="receiver";
    state.ledger.settledSettlements=[{id:second,fromUserId:"payer",toUserId:"receiver"}];
    const response=await call({action:"MARK_RECEIVED",settlementId:second});
    expect((await response.json()).idempotent).toBe(true);
    expect(state.updates).toBe(0);
  });
});
