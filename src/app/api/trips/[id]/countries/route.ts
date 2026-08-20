import {
  isTrustedMutationRequest,
  mutationRejectedResponse,
} from "@/lib/request-security";
import { getSession } from "@/lib/session";
import { canManageTrip } from "@/lib/trip-management";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: Request,
  context: Context,
) {
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

  const { id: tripId } = await context.params;

  if (!(await canManageTrip(session.user, tripId))) {
    return Response.json(
      { error: "Forbidden" },
      { status: 403 },
    );
  }

  return Response.json(
    {
      error:
        "Destination country is locked after trip creation. One trip can only have one country.",
    },
    { status: 409 },
  );
}
