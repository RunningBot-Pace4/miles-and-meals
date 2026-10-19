import { beforeEach, describe, it, expect, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
const state = vi.hoisted(() => ({ session: { user: { id: "owner", role: "user" }, session: {} } as any, configured: true, bytes: 0, owned: 0, rows: [] as any[], inserts: [] as any[], conditions: [] as any[], lock: vi.fn(), opened: vi.fn() }));
vi.mock("@/lib/session", () => ({ getSession: async () => state.session, isSystemAdmin: (role: string) => role === "admin" }));
vi.mock("@/lib/shared-media-server", () => ({ mediaStorageConfigured: () => state.configured, privateMediaHeaders: { "cache-control": "private, no-store" } }));
vi.mock("@/db", () => ({ db: { select: () => { const q: any = { from: () => q, innerJoin: () => q, where: (condition: any) => { state.conditions.push(condition); return q; }, orderBy: () => q, limit: () => q, offset: async () => state.rows }; return q; } } }));
vi.mock("@/db/transaction", () => ({ createTransactionalDatabase: () => { state.opened(); return { database: { transaction: async (callback: any) => callback({ execute: state.lock, select: () => ({ from: () => ({ where: async () => [{ bytes: state.bytes, owned: state.owned }] }) }), insert: () => ({ values: async (row: any) => { state.inserts.push(row); } }) }) }, close: async () => {} }; } }));
import { GET, POST } from "@/app/api/shared-media/route";
import { MAX_SHARED_BYTES } from "@/lib/shared-media";
const input = { name: "photo.jpg", contentType: "image/jpeg", byteSize: 10, consent: true, consentVersion: "admin-sharing-v1" };
const post = (data = input) => POST(new Request("https://app.test/api/shared-media", { method: "POST", headers: { "content-type": "application/json", origin: "https://app.test" }, body: JSON.stringify(data) }));
beforeEach(() => { Object.assign(state, { session: { user: { id: "owner", role: "user" }, session: {} }, configured: true, bytes: 0, owned: 0, rows: [], inserts: [], conditions: [] }); state.lock.mockReset(); state.opened.mockReset(); });
describe("shared-media consent, quotas and directory", () => {
  it("records the exact notice and owner on explicit consent, with a serialized quota check", async () => {
    expect((await post()).status).toBe(201); expect(state.lock).toHaveBeenCalledOnce(); expect(state.inserts[0]).toMatchObject({ ownerId: "owner", consentVersion: input.consentVersion, name: "photo.jpg" }); expect(state.inserts[0].consentText).toContain("system admins"); expect(state.inserts[0].consentedAt).toBeInstanceOf(Date);
  });
  it("rejects absent consent, stale notice versions, oversized and unsupported files before opening a transaction", async () => {
    for (const data of [{ ...input, consent: false }, { ...input, consent: undefined }, { ...input, consentVersion: "old" }, { ...input, byteSize: 26214401 }, { ...input, contentType: "text/html" }]) expect((await post(data as any)).status).toBe(400);
    expect(state.opened).not.toHaveBeenCalled(); expect(state.inserts).toHaveLength(0);
  });
  it("blocks anonymous and impersonated consent", async () => {
    state.session = null; expect((await post()).status).toBe(401); state.session = { user: { id: "owner" }, session: { impersonatedBy: "admin" } }; expect((await post()).status).toBe(403); expect(state.inserts).toHaveLength(0);
  });
  it("enforces app-wide bytes and per-owner reservations", async () => {
    state.bytes = MAX_SHARED_BYTES; expect((await post()).status).toBe(409); state.bytes = 0; state.owned = 100; expect((await post()).status).toBe(409); expect(state.inserts).toHaveLength(0);
  });
  it("forces ordinary users to their own files even when they request admin scope", async () => {
    const response = await GET(new Request("https://app.test/api/shared-media?scope=all")); expect(response.status).toBe(200);
    const query = new PgDialect().sqlToQuery(state.conditions[0]); expect(query.params).toEqual(["REVOKED", "owner"]);
    state.session.user.role = "admin"; await GET(new Request("https://app.test/api/shared-media?scope=all")); expect(new PgDialect().sqlToQuery(state.conditions[1]).params).toEqual(["REVOKED"]);
  });
  it("renders a setup state without touching the database when storage is disabled", async () => {
    state.configured = false; const result = await GET(new Request("https://app.test/api/shared-media")); expect(await result.json()).toMatchObject({ configured: false, files: [] }); expect(state.conditions).toHaveLength(0);
  });
});
