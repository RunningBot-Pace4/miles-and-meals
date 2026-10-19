import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSession } from "@/lib/session";
import { isTrustedMutationRequest, mutationRejectedResponse } from "@/lib/request-security";
import { findSharedMedia, completeSharedMedia, mediaStorageConfigured } from "@/lib/shared-media-server";
import { uuidSchema } from "@/lib/validation";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!mediaStorageConfigured()) return Response.json({ error: "Shared gallery storage has not been set up." }, { status: 503 });
  const body = await request.json().catch(() => null) as HandleUploadBody | null;
  if (!body || !["blob.generate-client-token", "blob.upload-completed"].includes(body.type)) return Response.json({ error: "Invalid upload." }, { status: 400 });
  // Completed callbacks have no browser session. The SDK verifies their signature;
  // token generation still requires an authenticated same-origin owner request.
  if (body.type === "blob.generate-client-token" && !isTrustedMutationRequest(request)) return mutationRejectedResponse();
  try {
    const result = await handleUpload({ request, body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const session = await getSession();
        if (!session || session.session.impersonatedBy) throw new Error("Owner sign-in required.");
        if (!uuidSchema.safeParse(clientPayload).success) throw new Error("Invalid upload.");
        const row = await findSharedMedia(clientPayload!);
        if (!row || row.ownerId !== session.user.id || row.status !== "UPLOADING" || row.pathname !== pathname || Date.now() - row.createdAt.getTime() > 10 * 60_000) throw new Error("Upload is not authorized.");
        return { allowedContentTypes: [row.contentType], maximumSizeInBytes: row.byteSize, addRandomSuffix: false, allowOverwrite: false, validUntil: row.createdAt.getTime() + 10 * 60_000, tokenPayload: row.id };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        if (!uuidSchema.safeParse(tokenPayload).success) throw new Error("Invalid upload.");
        const row = await findSharedMedia(tokenPayload!);
        if (!row || row.pathname !== blob.pathname) throw new Error("Invalid upload.");
        await completeSharedMedia(row.id);
      },
    });
    return Response.json(result, { headers: { "cache-control": "no-store" } });
  } catch { return Response.json({ error: "Upload not authorized or unavailable. Sign in with your own account and try again." }, { status: 403 }); }
}
