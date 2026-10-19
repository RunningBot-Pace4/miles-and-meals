import { beforeEach, describe, it, expect, vi } from "vitest";
const state = vi.hoisted(() => ({ row: null as any, meta: null as any, result: [{ id: "file" }] as any[], cancel: vi.fn(), deleted: vi.fn(), fetched: vi.fn(), sets: [] as any[] }));
vi.mock("@/db", () => ({ db: {
  select: () => ({ from: () => ({ where: () => ({ limit: async () => state.row ? [state.row] : [] }) }) }),
  update: () => ({ set: (value: any) => { state.sets.push(value); return { where: () => ({ returning: async () => { if (value.status === "REVOKED") { state.row.status = "REVOKED"; return [{ pathname: state.row.pathname }]; } return state.result; } }) }; } }),
} }));
vi.mock("@vercel/blob", () => ({ head: async () => state.meta, del: (...args: any[]) => state.deleted(...args), get: (...args: any[]) => state.fetched(...args) }));
import { completeSharedMedia, revokeSharedMedia } from "@/lib/shared-media-server";
beforeEach(() => {
  state.row = { id: "file", pathname: "shared-media/file.jpg", contentType: "image/jpeg", byteSize: 10, status: "UPLOADING", consentVersion: "admin-sharing-v1", createdAt: new Date() };
  state.meta = { url: "https://store.private.blob.vercel-storage.com/shared-media/file.jpg", pathname: state.row.pathname, contentType: "image/jpeg", size: 10 };
  state.result = [{ id: "file" }]; state.sets = []; state.deleted.mockReset(); state.deleted.mockResolvedValue(undefined); state.fetched.mockReset(); state.cancel.mockReset();
  state.fetched.mockResolvedValue({ stream: { getReader: () => ({ read: async () => ({ value: new Uint8Array(512).fill(0).map((_,i) => [255,216,255][i] || 0), done: false }), cancel: state.cancel }) } });
});
describe("shared upload completion and revocation", () => {
  it("validates private metadata and bytes before publishing, then releases the stream", async () => { expect(await completeSharedMedia("file")).toBe(true); expect(state.sets).toEqual([{ status: "READY" }]); expect(state.cancel).toHaveBeenCalledOnce(); });
  it("deletes late uploads after revocation instead of restoring sharing", async () => { state.row.status = "REVOKED"; expect(await completeSharedMedia("file")).toBe(false); expect(state.deleted).toHaveBeenCalledWith(state.row.pathname); expect(state.fetched).not.toHaveBeenCalled(); expect(state.sets).toHaveLength(0); });
  it("rejects a public store or mismatched reserved metadata", async () => {
    state.meta.url = "https://store.public.blob.vercel-storage.com/shared-media/file.jpg"; expect(await completeSharedMedia("file")).toBe(false); expect(state.sets[0].status).toBe("REVOKED"); expect(state.deleted).toHaveBeenCalled();
  });
  it("rejects content disguised with an image MIME type", async () => {
    state.fetched.mockResolvedValue({ stream: { getReader: () => ({ read: async () => ({ value: new Uint8Array(512), done: false }), cancel: state.cancel }) } });
    expect(await completeSharedMedia("file")).toBe(false); expect(state.row.status).toBe("REVOKED");
  });
  it("commits revocation before a storage cleanup error", async () => {
    state.deleted.mockRejectedValue(new Error("Unavailable")); expect(await revokeSharedMedia("file")).toBe(false); expect(state.row.status).toBe("REVOKED");
  });
});
