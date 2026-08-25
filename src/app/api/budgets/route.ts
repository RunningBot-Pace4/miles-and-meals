import { recordActivity } from "@/lib/activity";
import {
  isTrustedMutationRequest,
  mutationRejectedResponse,
} from "@/lib/request-security";
import { getSession } from "@/lib/session";
import {
  listMissingTripBudgets,
  savePersonalTripBudget,
} from "@/lib/trip-budget";
import { personalTripBudgetSchema } from "@/lib/validation";
import { closedTripReadOnlyResponse } from "@/lib/financial-close";


export async function GET() {
  const session = await getSession();

  if (!session) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const missing =
    await listMissingTripBudgets(
      session.user.id,
    );

  return Response.json({
    missing,
    missingBudgetCount:
      missing.length,
  });
}

export async function POST(
  request: Request,
) {
  if (!isTrustedMutationRequest(request)) {
    return mutationRejectedResponse();
  }

  const session =
    await getSession();

  if (!session) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const input =
      personalTripBudgetSchema.parse(
        await request.json(),
      );

    const locked = await closedTripReadOnlyResponse(input.tripId);
    if (locked) return locked;

    await savePersonalTripBudget(
      session.user.id,
      input.tripId,
      input.amount,
    );

    await recordActivity({
      actorUserId:
        session.user.id,
      action: "UPDATED",
      entityType: "TRIP_BUDGET",
      entityId:
        `${input.tripId}:${session.user.id}`,
      tripId: input.tripId,
      summary:
        `${session.user.name} updated a personal trip budget.`,
      metadata: {
        amount: input.amount,
      },
    });

    return Response.json({
      ok: true,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to save budget.",
      },
      { status: 400 },
    );
  }
}
