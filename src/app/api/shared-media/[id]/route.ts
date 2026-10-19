import { get } from "@vercel/blob";
import { getSession, isSystemAdmin } from "@/lib/session";
import { isTrustedMutationRequest, mutationRejectedResponse } from "@/lib/request-security";
import { findSharedMedia, privateMediaHeaders, revokeSharedMedia } from "@/lib/shared-media-server";
import { parseMediaRange } from "@/lib/shared-media";
import { uuidSchema } from "@/lib/validation";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  const session = await getSession();
  if (!session) return new Response(null, { status: 401, headers: privateMediaHeaders });
  const { id } = await context.params;
  if (!uuidSchema.safeParse(id).success) return new Response(null, { status: 404, headers: privateMediaHeaders });
  try {
    const row = await findSharedMedia(id);
    if (!row || row.status !== "READY" || (row.ownerId !== session.user.id && !isSystemAdmin(session.user.role))) return new Response(null, { status: 404, headers: privateMediaHeaders });
    const range = parseMediaRange(request.headers.get("range"), row.byteSize);
    if (range === false) return new Response(null, { status: 416, headers: { ...privateMediaHeaders, "content-range": `bytes */${row.byteSize}` } });
    const content = await get(row.pathname, { access: "private", abortSignal: request.signal, headers: range ? { Range: `bytes=${range.start}-${range.end}` } : undefined });
    if (!content?.stream) return new Response(null, { status: 404, headers: privateMediaHeaders });
    const headers = new Headers({ ...privateMediaHeaders, "content-type": row.contentType, "content-disposition": "inline", "accept-ranges": "bytes", "cross-origin-resource-policy": "same-origin" });
    const contentRange = content.headers.get("content-range");
    if (contentRange) headers.set("content-range", contentRange);
    const length = content.headers.get("content-length");
    if (length) headers.set("content-length", length);
    return new Response(content.stream, { status: contentRange ? 206 : 200, headers });
  } catch { return new Response(null, { status: 503, headers: privateMediaHeaders }); }
}
export async function DELETE(request: Request, context: Context) {
  if (!isTrustedMutationRequest(request)) return mutationRejectedResponse();
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.session.impersonatedBy) return Response.json({ error: "Sign in with your own account." }, { status: 403 });
  const { id } = await context.params;
  if (!uuidSchema.safeParse(id).success) return Response.json({ error: "File not found." }, { status: 404 });
  try {
    const row = await findSharedMedia(id);
    if (!row || (row.ownerId !== session.user.id && !isSystemAdmin(session.user.role))) return Response.json({ error: "File not found." }, { status: 404 });
    const deleted = await revokeSharedMedia(id);
    return Response.json({ ok: true, cleanupPending: !deleted }, { headers: privateMediaHeaders });
  } catch { return Response.json({ error: "Could not remove sharing. Try again." }, { status: 503 }); }
}
