import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  loggedIn: true, access: true, editable: true, closed: false, missing: false,
  failInsert: false, failActivity: false, locked: false, transactions: 0,
  records: [] as Array<Record<string, any>>, activityCount: 0,
}));
vi.mock("@/lib/session", () => ({ getSession: async () => state.loggedIn ? { user: { id: "traveler", name: "JY" } } : null }));
vi.mock("@/lib/access", () => ({ canAccessCountry: async () => state.access, getCountryWithTrip: async () => ({ tripId: "trip" }) }));
vi.mock("@/lib/trip-capabilities", () => ({ getTripCapabilities: async () => ({ canEditPlan: state.editable }) }));
vi.mock("@/lib/activity", () => ({ recordActivity: async () => { state.activityCount++; if (state.failActivity) throw new Error("Activity unavailable"); } }));
vi.mock("@/db/transaction", () => ({ createTransactionalDatabase: () => ({ close: async () => {}, database: {
  transaction: async (fn: (tx: any) => Promise<unknown>) => {
    state.transactions++;
    const staged = [...state.records];
    const result = await fn({
      select: () => ({ from: () => ({ where: () => {
        const query = Promise.resolve(staged);
        return Object.assign(query, { for: async () => {
          state.locked = true;
          return state.missing ? [] : [{ id: "trip", status: state.closed ? "CLOSED" : "OPEN" }];
        } });
      } }) }),
      insert: () => ({ values: (values: any[]) => ({ returning: async () => {
        expect(state.locked).toBe(true);
        if (state.failInsert) throw new Error("Database unavailable");
        const saved = values.map((value, index) => ({ ...value, id: `saved-${staged.length + index}` }));
        staged.push(...saved);
        return saved;
      } }) }),
    });
    state.records = staged;
    return result;
  },
} }) }));

import { POST } from "@/app/api/travel-items/import-places/route";
const countryId = "10000000-0000-4000-8000-000000000001";
const place = (id: number) => ({ title: `Place ${id}`, linkUrl: `https://www.google.com/maps/place/name/data=!4m2!3m1!1s0x123:0x${id}`, notes: "Keep my note" });
const call = (places = [place(1), place(2)], origin = "https://app.test") => POST(new Request("https://app.test/api/travel-items/import-places", {
  method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify({ countryId, places }),
}));

beforeEach(() => Object.assign(state, { loggedIn: true, access: true, editable: true, closed: false, missing: false, failInsert: false, failActivity: false, locked: false, transactions: 0, records: [], activityCount: 0 }));

describe("places batch import API", () => {
  it("saves selected places into the explicit country with no invented dates", async () => {
    const response = await call();
    expect(response.status).toBe(201);
    const result = await response.json();
    expect(result.imported).toBe(2);
    expect(result.items[0]).toMatchObject({ countryId, itemType: "PLACE", provider: "Google Maps", title: "Place 1", notes: "Keep my note", status: "Idea", createdBy: "traveler" });
    expect(result.items[0].itemDate).toBeUndefined();
  });
  it("makes repeat requests safe and preserves existing edits", async () => {
    await call();
    state.records[0].notes = "Edited later";
    const result = await (await call()).json();
    expect(result).toMatchObject({ imported: 0, skipped: 2 });
    expect(state.records).toHaveLength(2);
    expect(state.records[0].notes).toBe("Edited later");
    expect(state.activityCount).toBe(1);
  });
  it("skips duplicates within a batch and appends new places in list order", async () => {
    state.records = [{ linkUrl: place(1).linkUrl, sortOrder: 7 }];
    const result = await (await call([place(1), place(2), place(2), place(3)])).json();
    expect(result).toMatchObject({ imported: 2, skipped: 2 });
    expect(result.items.map((item: any) => item.sortOrder)).toEqual([8, 9]);
  });
  it.each([
    ["loggedIn", false, 401], ["access", false, 403], ["editable", false, 403],
    ["closed", true, 423], ["missing", true, 404],
  ] as const)("rejects invalid %s state", async (field, value, status) => {
    state[field] = value;
    expect((await call()).status).toBe(status);
    expect(state.records).toHaveLength(0);
  });
  it("rejects cross-site writes and unsafe URLs before opening a transaction", async () => {
    expect((await call([place(1)], "https://evil.test")).status).toBe(403);
    expect((await call([{ ...place(1), linkUrl: "javascript:alert(1)" }])).status).toBe(400);
    expect((await call([])).status).toBe(400);
    expect(state.transactions).toBe(0);
  });
  it("does not persist a partial batch on database failure", async () => {
    state.failInsert = true;
    expect((await call()).status).toBe(503);
    expect(state.records).toHaveLength(0);
  });
  it("reports committed success even if the activity log fails", async () => {
    state.failActivity = true;
    expect((await call()).status).toBe(201);
    expect(state.records).toHaveLength(2);
  });
});
