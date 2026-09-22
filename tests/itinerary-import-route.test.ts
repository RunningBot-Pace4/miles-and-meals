import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ loggedIn: true, access: true, editable: true, closed: false, fail: false, records: [] as any[], locked: false }));
vi.mock("@/lib/session", () => ({ getSession: async () => state.loggedIn ? { user: { id: "me", name: "JY" } } : null }));
vi.mock("@/lib/access", () => ({ canAccessCountry: async () => state.access, getCountryWithTrip: async () => ({ tripId: "trip" }) }));
vi.mock("@/lib/trip-capabilities", () => ({ getTripCapabilities: async () => ({ canEditPlan: state.editable }) }));
vi.mock("@/lib/activity", () => ({ recordActivity: async () => {} }));
vi.mock("@/db/transaction", () => ({ createTransactionalDatabase: () => ({ close: async () => {}, database: {
  transaction: async (fn: (tx: any) => Promise<unknown>) => {
    const staged = [...state.records];
    const result = await fn({
      select: () => ({ from: () => ({ where: () => Object.assign(Promise.resolve(staged), { for: async () => { state.locked = true; return [{ id: "trip", status: state.closed ? "CLOSED" : "OPEN" }]; } }) }) }),
      insert: () => ({ values: (values: any[]) => ({ returning: async () => {
        expect(state.locked).toBe(true);
        if (state.fail) throw Error("Database offline");
        const saved = values.map((value, i) => ({ ...value, id: `item-${staged.length + i}` })); staged.push(...saved); return saved;
      } }) }),
    });
    state.records = staged; return result;
  },
} }) }));
import { POST } from "../src/app/api/travel-items/import-itinerary/route";
const countryId = "10000000-0000-4000-8000-000000000001";
const row = { title: "Temple", itemDate: "2026-09-25", itemTime: "14:25-15:05", area: "Sheung Wan", subtype: "Place", notes: "My note", linkUrl: "" };
const call = (rows = [row], origin = "https://app.test") => POST(new Request("https://app.test/api/travel-items/import-itinerary", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ countryId, rows }) }));
beforeEach(() => Object.assign(state, { loggedIn: true, access: true, editable: true, closed: false, fail: false, locked: false, records: [] }));
describe("itinerary import transaction", () => {
  it("saves activities in file order into only the chosen trip's itinerary", async () => {
    const response = await call([row, { ...row, title: "Dinner", itemTime: "After sunset" }]);
    expect(response.status).toBe(201);
    expect(state.records).toHaveLength(2);
    expect(state.records[0]).toMatchObject({ countryId, itemType: "ITINERARY", title: "Temple", sortOrder: 0, durationMinutes: 40 });
    expect(state.records[1]).toMatchObject({ itemTime: "After sunset", sortOrder: 1, durationMinutes: null });
  });
  it("skips duplicates in the file and retries, preserving existing notes", async () => {
    expect(await (await call([row, row])).json()).toMatchObject({ imported: 1, skipped: 1 });
    state.records[0].notes = "Edited in the app";
    expect(await (await call()).json()).toMatchObject({ imported: 0, skipped: 1 });
    expect(state.records[0].notes).toBe("Edited in the app");
  });
  it.each([["loggedIn",401],["access",403],["editable",403]] as const)("rejects when %s is false", async (key, status) => {
    state[key] = false; expect((await call()).status).toBe(status); expect(state.records).toEqual([]);
  });
  it("rejects closed trips inside the transaction and cross-site requests", async () => {
    state.closed = true; expect((await call()).status).toBe(423);
    expect((await call([row], "https://evil.test")).status).toBe(403);
    expect(state.records).toEqual([]);
  });
  it("validates submitted rows again and rejects malformed dates and unsafe URLs", async () => {
    expect((await call([{ ...row, itemDate: "2026-02-30" }])).status).toBe(400);
    expect((await call([{ ...row, linkUrl: "javascript:alert(1)" }])).status).toBe(400);
    expect(state.records).toEqual([]);
  });
  it("rolls back the whole import when storage fails", async () => {
    state.fail = true; expect((await call()).status).toBe(503); expect(state.records).toEqual([]);
  });
});
