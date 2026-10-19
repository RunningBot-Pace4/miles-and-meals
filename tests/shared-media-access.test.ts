import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ session: { user: { id: "owner", role: "user" }, session: {} } as any, row: { id: "10000000-0000-4000-8000-000000000001", ownerId: "owner", status: "READY", pathname: "shared-media/file.mp4", byteSize: 100, contentType: "video/mp4" } as any, cleanup: true, store: vi.fn(), revoke: vi.fn() }));
vi.mock("@/lib/session", () => ({ getSession: async () => state.session, isSystemAdmin: (role: string) => role === "admin" }));
vi.mock("@/lib/shared-media-server", () => ({ findSharedMedia: async () => state.row, revokeSharedMedia: async (id: string) => { state.revoke(id); state.row.status = "REVOKED"; return state.cleanup; }, privateMediaHeaders: { "cache-control": "private, no-store", vary: "Cookie" } }));
vi.mock("@vercel/blob", () => ({ get: (...args: any[]) => state.store(...args) }));
import { GET, DELETE } from "@/app/api/shared-media/[id]/route";
const context = { params: Promise.resolve({ id: "10000000-0000-4000-8000-000000000001" }) };
const get = (range?: string) => GET(new Request("https://app.test/api/shared-media/" + "10000000-0000-4000-8000-000000000001", { headers: range ? { range } : {} }), context);
const remove = (origin = "https://app.test") => DELETE(new Request("https://app.test/api/shared-media/id", { method: "DELETE", headers: { origin } }), context);
beforeEach(() => {
  state.session = { user: { id: "owner", role: "user" }, session: {} };
  state.row = { id: "10000000-0000-4000-8000-000000000001", ownerId: "owner", status: "READY", pathname: "shared-media/file.mp4", byteSize: 100, contentType: "video/mp4" };
  state.cleanup = true; state.store.mockReset(); state.revoke.mockReset();
  state.store.mockResolvedValue({ stream: new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array([1,2])); controller.close(); } }), headers: new Headers({ "content-length": "2", "content-range": "bytes 0-1/100" }) });
});
describe("remote shared-media authorization", () => {
  it("blocks anonymous users before storage reads", async () => { state.session = null; expect((await get()).status).toBe(401); expect(state.store).not.toHaveBeenCalled(); });
  it("blocks another traveler even with a known valid media UUID", async () => { state.session.user.id = "other"; expect((await get()).status).toBe(404); expect((await remove()).status).toBe(404); expect(state.store).not.toHaveBeenCalled(); expect(state.revoke).not.toHaveBeenCalled(); });
  it("permits owner and system admin, preserves byte-range playback and prevents caching", async () => {
    const response = await get("bytes=0-1"); expect(response.status).toBe(206); expect(response.headers.get("cache-control")).toContain("no-store"); expect(response.headers.get("vary")).toBe("Cookie"); expect(response.headers.get("content-range")).toBe("bytes 0-1/100");
    expect(state.store).toHaveBeenCalledWith(state.row.pathname, expect.objectContaining({ access: "private", headers: { Range: "bytes=0-1" } }));
    state.session.user = { id: "admin", role: "admin" }; expect((await get()).status).toBe(206);
  });
  it("does not reveal pending or revoked media even to admins", async () => {
    state.session.user = { id: "admin", role: "admin" };
    state.row.status = "UPLOADING"; expect((await get()).status).toBe(404);
    state.row.status = "REVOKED"; expect((await get()).status).toBe(404); expect(state.store).not.toHaveBeenCalled();
  });
  it("rejects bad byte ranges before contacting storage", async () => { expect((await get("bytes=1000-")).status).toBe(416); expect(state.store).not.toHaveBeenCalled(); });
  it("revokes immediately even if object deletion needs a cleanup retry", async () => {
    state.cleanup = false; const response = await remove(); expect(await response.json()).toEqual({ ok: true, cleanupPending: true });
    expect((await get()).status).toBe(404); expect(state.revoke).toHaveBeenCalledOnce();
  });
  it("blocks cross-site removal and impersonated user mutations", async () => {
    expect((await remove("https://other.test")).status).toBe(403);
    state.session.session.impersonatedBy = "admin"; expect((await remove()).status).toBe(403); expect(state.revoke).not.toHaveBeenCalled();
  });
});
