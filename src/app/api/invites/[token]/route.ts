import { acceptTripInvite, getTripInvitePreview } from "@/lib/trip-invites";
import { isTrustedMutationRequest, mutationRejectedResponse } from "@/lib/request-security";
import { getSession } from "@/lib/session";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const preview = await getTripInvitePreview(token);
  if (!preview) {
    return Response.json({ error: "Invite not found." }, { status: 404 });
  }
  return Response.json({ invite: preview });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  if (!isTrustedMutationRequest(request)) {
    return mutationRejectedResponse();
  }
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { token } = await context.params;
    const result = await acceptTripInvite(token, session.user.id);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to join trip." },
      { status: 400 },
    );
  }
}
