import { createTripInvite, revokeTripInvites } from "@/lib/trip-invites";
import { isTrustedMutationRequest, mutationRejectedResponse } from "@/lib/request-security";
import { getSession } from "@/lib/session";
import { closedTripReadOnlyResponse } from "@/lib/financial-close";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isTrustedMutationRequest(request)) {
    return mutationRejectedResponse();
  }

  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const locked = await closedTripReadOnlyResponse(id);
    if (locked) return locked;
    const { token, expiresAt } = await createTripInvite({
      currentUser: session.user,
      tripId: id,
    });
    return Response.json({ token, expiresAt: expiresAt.toISOString() });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to create invite." },
      { status: 400 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isTrustedMutationRequest(request)) {
    return mutationRejectedResponse();
  }

  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const locked = await closedTripReadOnlyResponse(id);
    if (locked) return locked;
    await revokeTripInvites({ currentUser: session.user, tripId: id });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to revoke invite links." },
      { status: 400 },
    );
  }
}
