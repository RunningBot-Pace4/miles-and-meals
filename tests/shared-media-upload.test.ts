import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ session: { user: { id: "owner" }, session: {} } as any, row: { id: "10000000-0000-4000-8000-000000000001", pathname: "shared-media/file.jpg", ownerId: "owner", status: "UPLOADING", byteSize: 10, contentType: "image/jpeg", createdAt: new Date() } as any, options: null as any, complete: vi.fn() }));
vi.mock("@/lib/session", () => ({ getSession: async () => state.session }));
vi.mock("@/lib/shared-media-server", () => ({ mediaStorageConfigured: () => true, findSharedMedia: async () => state.row, completeSharedMedia: (...args: any[]) => state.complete(...args) }));
vi.mock("@vercel/blob/client", () => ({ handleUpload: async (options: any) => { state.options = options; return { type: "blob.generate-client-token", clientToken: "not-a-real-token" }; } }));
import { POST } from "@/app/api/shared-media/upload/route";
const id = "10000000-0000-4000-8000-000000000001";
beforeEach(() => { state.session = { user: { id: "owner" }, session: {} }; state.row = { id, pathname: "shared-media/file.jpg", ownerId: "owner", status: "UPLOADING", byteSize: 10, contentType: "image/jpeg", createdAt: new Date() }; state.options = null; state.complete.mockReset(); });
async function setup() { await POST(new Request("https://app.test/api/shared-media/upload", { method: "POST", headers: { origin: "https://app.test", "content-type": "application/json" }, body: JSON.stringify({ type: "blob.generate-client-token", payload: { pathname: "shared-media/file.jpg", clientPayload: id, multipart: false } }) })); return state.options; }
describe("consented upload token scoping", () => {
  it("scopes a short-lived non-overwritable token to the reserved size and type", async () => {
    const options = await setup(); const token = await options.onBeforeGenerateToken(state.row.pathname, id);
    expect(token).toMatchObject({ allowedContentTypes: ["image/jpeg"], maximumSizeInBytes: 10, allowOverwrite: false, addRandomSuffix: false, tokenPayload: id });
    expect(token.validUntil).toBe(state.row.createdAt.getTime() + 600000);
  });
  it("requires the owner's own sign-in rather than admin impersonation", async () => {
    const options = await setup(); state.session = null; await expect(options.onBeforeGenerateToken(state.row.pathname,id)).rejects.toThrow();
    state.session = { user: { id: "owner" }, session: { impersonatedBy: "admin" } }; await expect(options.onBeforeGenerateToken(state.row.pathname,id)).rejects.toThrow();
  });
  it("rejects another owner, changed paths, revoked files and expired reservations", async () => {
    const options = await setup(); state.row.ownerId = "other"; await expect(options.onBeforeGenerateToken(state.row.pathname,id)).rejects.toThrow(); state.row.ownerId = "owner";
    await expect(options.onBeforeGenerateToken("shared-media/other.jpg",id)).rejects.toThrow();
    state.row.status = "REVOKED"; await expect(options.onBeforeGenerateToken(state.row.pathname,id)).rejects.toThrow(); state.row.status = "UPLOADING";
    state.row.createdAt = new Date(Date.now() - 601000); await expect(options.onBeforeGenerateToken(state.row.pathname,id)).rejects.toThrow();
  });
  it("does not accept an unrelated file path from a completed callback", async () => { const options = await setup(); await expect(options.onUploadCompleted({ blob: { pathname: "shared-media/other.jpg" }, tokenPayload: id })).rejects.toThrow(); expect(state.complete).not.toHaveBeenCalled(); });
});
