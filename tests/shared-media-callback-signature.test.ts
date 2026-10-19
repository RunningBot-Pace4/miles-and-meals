import { expect, it, vi } from "vitest";
const complete = vi.hoisted(() => vi.fn());
vi.mock("@/lib/session", () => ({ getSession: async () => null }));
vi.mock("@/lib/shared-media-server", () => ({ mediaStorageConfigured: () => true, findSharedMedia: complete, completeSharedMedia: complete }));
import { POST } from "@/app/api/shared-media/upload/route";
it("uses the real Blob SDK to reject unsigned upload-completed callbacks before touching data", async () => {
  vi.stubEnv("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_teststore_unusable_test_token");
  try {
    const response = await POST(new Request("https://app.test/api/shared-media/upload", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "blob.upload-completed", payload: { blob: { pathname: "shared-media/x.jpg" }, tokenPayload: "10000000-0000-4000-8000-000000000001" } }) }));
    expect(response.status).toBe(403); expect(complete).not.toHaveBeenCalled();
  } finally { vi.unstubAllEnvs(); }
});
