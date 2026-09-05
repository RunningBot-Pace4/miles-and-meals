import { z } from "zod";
import { canAccessTrip } from "@/lib/access";
import {
  closeTripFinancials,
  getTripFinancialState,
  reopenTripFinancials,
} from "@/lib/financial-close";
import {
  isTrustedMutationRequest,
  mutationRejectedResponse,
} from "@/lib/request-security";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ id: string }>;
};

const actionSchema = z.object({
  action: z.enum(["CLOSE", "REOPEN"]),
});

export async function GET(_request: Request, context: Context) {
  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  if (!(await canAccessTrip(session.user, id))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const state = await getTripFinancialState(id);

  if (!state) {
    return Response.json({ error: "Trip not found." }, { status: 404 });
  }

  return Response.json(state, {
    headers: { "cache-control": "no-store" },
  });
}

export async function POST(request: Request, context: Context) {
  if (!isTrustedMutationRequest(request)) {
    return mutationRejectedResponse();
  }

  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const input = actionSchema.parse(await request.json());
    const state =
      input.action === "CLOSE"
        ? await closeTripFinancials(session.user, id)
        : await reopenTripFinancials(session.user, id);

    return Response.json({ ok: true, state });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update the trip financial state.";
    const status = /Only the Trip Owner|System Admin/.test(message) ? 403 : 400;

    return Response.json({ error: message }, { status });
  }
}
