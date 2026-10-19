import { getSession } from "@/lib/session";
import { isTrustedMutationRequest, mutationRejectedResponse } from "@/lib/request-security";
import { completeSharedMedia, findSharedMedia } from "@/lib/shared-media-server";
import { uuidSchema } from "@/lib/validation";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) return mutationRejectedResponse();
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.session.impersonatedBy) return Response.json({ error: "Owner sign-in required." }, { status: 403 });
  const input = await request.json().catch(() => null);
  if (!uuidSchema.safeParse(input?.id).success) return Response.json({ error: "Invalid file." }, { status: 400 });
  try {
    const row = await findSharedMedia(input.id);
    if (!row || row.ownerId !== session.user.id) return Response.json({ error: "File not found." }, { status: 404 });
    if (!await completeSharedMedia(row.id)) return Response.json({ error: "This upload could not be shared. Check its format or select it again." }, { status: 409 });
    return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  } catch { return Response.json({ error: "Could not finish sharing. You can remove the upload and try again." }, { status: 503 }); }
}
