import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
const state = vi.hoisted(() => ({ loggedIn: true, access: true, edit: true, status: "OPEN", assigned: [] as Array<{ id: string; name: string }>, inserts: [] as Array<{ table: string; row: any }>, closed: 0 }));
vi.mock("@/lib/session", () => ({ getSession: async () => state.loggedIn ? { user: { id: "jy" } } : null }));
vi.mock("@/lib/access", () => ({ canAccessCountry: async () => state.access, getCountryWithTrip: async () => ({ tripId: "trip" }) }));
vi.mock("@/lib/trip-capabilities", () => ({ getTripCapabilities: async () => ({ canAddExpenses: state.edit }) }));
vi.mock("@/db/transaction", () => ({ createTransactionalDatabase: () => ({
  database: { transaction: async (callback: (tx: any) => Promise<unknown>) => callback({
    select: () => ({ from: (table: any) => {
      const rows = getTableName(table) === "country_members" ? state.assigned : [{ status: state.status }];
      const query: any = { innerJoin: () => query, where: () => query, for: async () => rows, then: (resolve: any) => Promise.resolve(rows).then(resolve) }; return query;
    } }),
    insert: (table: any) => ({ values: async (row: any) => { const name = getTableName(table); state.inserts.push({ table: name, row }); if (name === "user") state.assigned.push({ id: row.id, name: row.name }); } }),
  }) }, close: async () => { state.closed++; },
}) }));
import { POST } from "@/app/api/countries/[id]/guests/route";
const country = "10000000-0000-4000-8000-000000000001";
const requestId = "10000000-0000-4000-8000-000000000002";
const post = (name = "Alex", origin = "https://app.test", id = requestId) => POST(new Request("https://app.test/api/countries/" + country + "/guests", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ name, requestId: id }) }), { params: Promise.resolve({ id: country }) });
beforeEach(() => Object.assign(state, { loggedIn: true, access: true, edit: true, status: "OPEN", assigned: [], inserts: [], closed: 0 }));
describe("named guest creation", () => {
  it("creates only a non-login financial participant and country assignment", async () => {
    const response = await post();
    expect(response.status).toBe(200);
    expect((await response.json()).guest).toMatchObject({ name: "Alex", isGuest: true });
    expect(state.inserts.map(row => row.table)).toEqual(["user", "country_members"]);
    expect(state.inserts[0].row).toMatchObject({ role: "guest", banned: true });
    expect(state.closed).toBe(1);
  });
  it("retries idempotently and reuses an existing named guest", async () => {
    const first = await (await post()).json();
    expect(await (await post()).json()).toEqual(first);
    expect(await (await post("alex", "https://app.test", "10000000-0000-4000-8000-000000000003")).json()).toEqual(first);
    expect(state.inserts).toHaveLength(2);
    expect((await post("Sam")).status).toBe(409);
  });
  it("blocks missing authentication, foreign trip access, viewer permission and cross-site requests", async () => {
    state.loggedIn = false; expect((await post()).status).toBe(401);
    state.loggedIn = true; state.access = false; expect((await post()).status).toBe(403);
    state.access = true; state.edit = false; expect((await post()).status).toBe(403);
    state.edit = true; expect((await post("Alex", "https://other.test")).status).toBe(403);
    expect(state.inserts).toHaveLength(0);
  });
  it("rejects closed trips and invalid names before creating financial rows", async () => {
    expect((await post(" ")).status).toBe(400);
    state.status = "CLOSED"; expect((await post()).status).toBe(423);
    expect(state.inserts).toHaveLength(0);
    expect(state.closed).toBe(1);
  });
});
