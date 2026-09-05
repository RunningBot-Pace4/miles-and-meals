import {
  isTrustedMutationRequest,
  mutationRejectedResponse,
} from "@/lib/request-security";
import { getSession } from "@/lib/session";
import { sendTestPushToUser } from "@/lib/push";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) {
    return mutationRejectedResponse();
  }

  const session = await getSession();

  if (!session) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const result =
    await sendTestPushToUser(
      session.user.id,
    );

  if (!result.configured) {
    return Response.json(
      {
        error:
          "Web Push is not configured on the server.",
      },
      { status: 400 },
    );
  }

  if (result.delivered === 0) {
    return Response.json(
      {
        error:
          "No active push subscription was found for this account. Enable notifications on this device first.",
        expired: result.expired,
      },
      { status: 400 },
    );
  }

  return Response.json({
    ok: true,
    delivered: result.delivered,
    expired: result.expired,
  });
}
