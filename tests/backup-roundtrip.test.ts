import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
const state = vi.hoisted(() => ({
  admin: true, rows: {} as Record<string, unknown[]>, options: undefined as unknown,
  closed: 0, failRead: false, queries: [] as Array<{ text: string; values: unknown[] }>, restores: 0,
}));
vi.mock("@/lib/session", () => ({ getSession: async () => ({ user: { id: "admin", role: state.admin ? "admin" : "user" } }), isSystemAdmin: (role: string) => role === "admin" }));
vi.mock("@/db", () => ({ db: { select: () => ({ from: async () => [{ id: "admin" }] }) } }));
vi.mock("@/db/transaction", () => ({ createTransactionalDatabase: () => ({
  database: { transaction: async (fn: (tx: any) => Promise<unknown>, options: unknown) => {
    state.options = options;
    return fn({ select: () => ({ from: async (table: any) => {
      if (state.failRead) throw new Error("read failed");
      return state.rows[getTableName(table)] ?? [];
    } }) });
  } }, close: async () => { state.closed++; },
}) }));
vi.mock("@neondatabase/serverless", () => ({ neon: () => {
  const sql = (strings: TemplateStringsArray, ...values: unknown[]) => ({ text: strings.join("?"), values });
  sql.transaction = async (queries: typeof state.queries) => { state.queries = queries; state.restores++; };
  return sql;
} }));
import { GET, POST } from "@/app/api/admin/backup/route";
const countryId = "10000000-0000-4000-8000-000000000001";
const stayId = "10000000-0000-4000-8000-000000000002";
const placeId = "10000000-0000-4000-8000-000000000003";
const route = { countryId, stayId, placeId, mode: "walk", pinKey: "saved-pins", km: 2.45, minutes: 26, checkedAt: "2026-09-29T00:00:00.000Z" };
const post = (backup: unknown, mode = "preview", confirmation?: string) => POST(new Request("https://app.test/api/admin/backup", {
  method: "POST", headers: { origin: "https://app.test", "content-type": "application/json" }, body: JSON.stringify({ backup, mode, confirmation }),
}));
beforeEach(() => {
  Object.assign(state, { admin: true, closed: 0, failRead: false, restores: 0, queries: [], options: undefined, rows: {
    trips: [{ id: "trip", createdBy: "admin" }], countries: [{ id: countryId, tripId: "trip" }],
    travel_items: [{ id: stayId, countryId, subtype: "Accommodation", itemType: "ITINERARY" }, { id: placeId, countryId, itemType: "PLACE" }],
    saved_route_distances: [route],
  } });
  vi.stubEnv("DATABASE_URL", "postgresql://test.invalid/test");
});
describe("admin backup and restore contract", () => {
  it("exports route results within one read-only repeatable-read transaction", async () => {
    const response = await GET();
    const backup = await response.json();
    expect(backup.version).toBe(7);
    expect(backup.data.savedRouteDistances).toEqual([route]);
    expect(state.options).toEqual({ isolationLevel: "repeatable read", accessMode: "read only" });
    expect(state.closed).toBe(1);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("closes its connection when export fails", async () => {
    state.failRead = true;
    await expect(GET()).rejects.toThrow("read failed");
    expect(state.closed).toBe(1);
  });
  it("previews without writes then restores routes after planner parents in the same SQL batch", async () => {
    const backup = await (await GET()).json();
    const preview = await (await post(backup)).json();
    expect(preview.preview.valid).toBe(true);
    expect(preview.preview.counts.savedRoutes).toBe(1);
    expect(state.restores).toBe(0);
    expect((await post(backup, "restore", "RESTORE TRAVEL DATA")).status).toBe(200);
    expect(state.restores).toBe(1);
    const routeIndex = state.queries.findIndex(q => q.text.includes("INSERT INTO saved_route_distances"));
    const placeIndex = state.queries.findIndex(q => q.text.includes("INSERT INTO travel_items"));
    expect(routeIndex).toBeGreaterThan(placeIndex);
    expect(state.queries[routeIndex].values.slice(0, 7)).toEqual([countryId, stayId, placeId, "walk", "saved-pins", 2.45, 26]);
    expect(state.queries.some(q => /DELETE FROM (?:"?user|account|session)/.test(q.text))).toBe(false);
  });
  it("accepts version 6 backups without routes", async () => {
    const backup = await (await GET()).json();
    backup.version = 6; delete backup.data.savedRouteDistances;
    const result = await (await post(backup)).json();
    expect(result.preview.valid).toBe(true);
    expect(result.preview.counts.savedRoutes).toBe(0);
  });
  it("blocks broken references and duplicate routes before destructive writes", async () => {
    const backup = await (await GET()).json();
    backup.data.savedRouteDistances.push({ ...route, countryId: "10000000-0000-4000-8000-000000000009" }, route);
    const response = await post(backup, "restore", "RESTORE TRAVEL DATA");
    expect(response.status).toBe(400);
    expect((await response.json()).preview.errors.join(" ")).toMatch(/same country.*duplicates/);
    expect(state.restores).toBe(0);
  });
  it("rejects invalid route measurements", async () => {
    const backup = await (await GET()).json();
    backup.data.savedRouteDistances[0].km = -1;
    expect((await post(backup, "restore", "RESTORE TRAVEL DATA")).status).toBe(400);
    expect(state.restores).toBe(0);
  });
  it("requires administrator access and explicit restore confirmation", async () => {
    const backup = await (await GET()).json();
    expect((await post(backup, "restore")).status).toBe(400);
    state.admin = false;
    expect((await GET()).status).toBe(403);
    expect((await post(backup)).status).toBe(403);
    expect(state.restores).toBe(0);
  });
});
