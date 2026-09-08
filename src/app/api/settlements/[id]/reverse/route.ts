import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { createTransactionalDatabase } from "@/db/transaction";
import {
  settlements,
  tripMembers,
  trips,
} from "@/db/schema";
import {
  canAccessCountry,
} from "@/lib/access";
import { recordActivity } from "@/lib/activity";
import {
  isTrustedMutationRequest,
  mutationRejectedResponse,
} from "@/lib/request-security";
import { sendPushToUsers } from "@/lib/push";
import {
  getSession,
  isSystemAdmin,
} from "@/lib/session";
import {
  canReverseSettlement,
  getReversalStatus,
  isTerminalReversalStatus,
  type SettlementStatus,
} from "@/lib/settlement-status";
import { isTripOwnerRole } from "@/lib/trip-roles";
import { canManageTrip } from "@/lib/trip-management";
import { settlementReversalSchema } from "@/lib/validation";

export const runtime = "nodejs";

class SettlementReversalError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

async function runBestEffortSideEffects(
  tasks: Array<Promise<unknown>>,
): Promise<void> {
  await Promise.allSettled(tasks);
}

export async function POST(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
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

  try {
    const { id } = await context.params;
    const input = settlementReversalSchema.parse(
      await request.json().catch(() => ({})),
    );
    const existing = (
      await db
        .select({
          id: settlements.id,
          tripId: settlements.tripId,
          countryId: settlements.countryId,
        })
        .from(settlements)
        .where(eq(settlements.id, id))
        .limit(1)
    )[0];

    if (!existing) {
      return Response.json(
        { error: "Payment not found." },
        { status: 404 },
      );
    }

    const [countryAccess, managerAccess] = await Promise.all([
      canAccessCountry(session.user, existing.countryId),
      canManageTrip(session.user, existing.tripId),
    ]);

    if (!countryAccess && !managerAccess) {
      return Response.json(
        { error: "Forbidden" },
        { status: 403 },
      );
    }

    const transactional = createTransactionalDatabase();
    let result:
      | {
          kind: "idempotent";
          status: "CANCELLED" | "REVERSED";
          settlementId: string;
        }
      | {
          kind: "reversed";
          status: "CANCELLED" | "REVERSED";
          settlementId: string;
          tripId: string;
          countryId: string;
          currency: string;
          amount: number;
          fromUserId: string;
          toUserId: string;
          reason: string;
        };

    try {
      result = await transactional.database.transaction(
        async (tx) => {
          const lockedTrip = (
            await tx
              .select({
                id: trips.id,
                createdBy: trips.createdBy,
              })
              .from(trips)
              .where(eq(trips.id, existing.tripId))
              .for("update")
          )[0];

          if (!lockedTrip) {
            throw new SettlementReversalError(
              "Trip not found.",
              404,
            );
          }

          const lockedSettlement = (
            await tx
              .select()
              .from(settlements)
              .where(eq(settlements.id, id))
              .for("update")
          )[0];

          if (!lockedSettlement) {
            throw new SettlementReversalError(
              "Payment not found.",
              404,
            );
          }

          if (lockedSettlement.tripId !== lockedTrip.id) {
            throw new SettlementReversalError(
              "Payment trip changed before reversal.",
              409,
              "STALE_SETTLEMENT",
            );
          }

          const membership = (
            await tx
              .select({
                role: tripMembers.role,
              })
              .from(tripMembers)
              .where(
                and(
                  eq(tripMembers.tripId, lockedTrip.id),
                  eq(tripMembers.userId, session.user.id),
                ),
              )
              .limit(1)
          )[0];
          const isTripManager =
            isSystemAdmin(session.user.role) ||
            lockedTrip.createdBy === session.user.id ||
            Boolean(
              membership &&
                isTripOwnerRole(membership.role),
            );
          const status = lockedSettlement.status as SettlementStatus;

          if (isTerminalReversalStatus(status)) {
            const isParticipant =
              lockedSettlement.fromUserId === session.user.id ||
              lockedSettlement.toUserId === session.user.id;

            if (!isParticipant && !isTripManager) {
              throw new SettlementReversalError(
                "You cannot reverse this payment.",
                403,
              );
            }

            return {
              kind: "idempotent" as const,
              status,
              settlementId: lockedSettlement.id,
            };
          }

          if (
            !canReverseSettlement(
              {
                status,
                fromUserId: lockedSettlement.fromUserId,
                toUserId: lockedSettlement.toUserId,
              },
              session.user.id,
              isTripManager,
            )
          ) {
            throw new SettlementReversalError(
              status === "SETTLED"
                ? "A confirmed payment can only be reversed by the receiver or a Trip Owner."
                : "A pending payment can only be cancelled by the payer or a Trip Owner.",
              403,
              "PAYMENT_REVERSAL_FORBIDDEN",
            );
          }

          const nextStatus = getReversalStatus(status);

          if (!nextStatus) {
            throw new SettlementReversalError(
              "Only sent or confirmed payments can be reversed.",
              409,
              "PAYMENT_NOT_REVERSIBLE",
            );
          }

          const reason =
            input.reason ||
            (nextStatus === "CANCELLED"
              ? "Cancelled before receiver confirmation."
              : "");

          if (
            nextStatus === "REVERSED" &&
            reason.trim().length < 3
          ) {
            throw new SettlementReversalError(
              "Add a short reason before reversing a confirmed payment.",
              400,
              "REVERSAL_REASON_REQUIRED",
            );
          }

          const now = new Date();
          const updated = await tx
            .update(settlements)
            .set({
              status: nextStatus,
              reversedBy: session.user.id,
              reversedAt: now,
              reversalReason: reason,
              updatedAt: now,
            })
            .where(
              and(
                eq(settlements.id, lockedSettlement.id),
                eq(settlements.status, status),
              ),
            )
            .returning({
              id: settlements.id,
            });

          if (!updated[0]) {
            throw new SettlementReversalError(
              "This payment changed before it could be reversed. Refresh and try again.",
              409,
              "STALE_SETTLEMENT",
            );
          }

          return {
            kind: "reversed" as const,
            status: nextStatus,
            settlementId: lockedSettlement.id,
            tripId: lockedSettlement.tripId,
            countryId: lockedSettlement.countryId,
            currency: lockedSettlement.currency,
            amount: Number(lockedSettlement.amount),
            fromUserId: lockedSettlement.fromUserId,
            toUserId: lockedSettlement.toUserId,
            reason,
          };
        },
      );
    } finally {
      await transactional.close();
    }

    if (result.kind === "idempotent") {
      return Response.json({
        ok: true,
        settlementId: result.settlementId,
        status: result.status,
        idempotent: true,
      });
    }

    const otherUserIds = [
      result.fromUserId,
      result.toUserId,
    ].filter((userId) => userId !== session.user.id);
    const verb =
      result.status === "CANCELLED"
        ? "cancelled"
        : "reversed";

    await runBestEffortSideEffects([
      recordActivity({
        actorUserId: session.user.id,
        action:
          result.status === "CANCELLED"
            ? "CANCELLED_PAYMENT"
            : "REVERSED_PAYMENT",
        entityType: "SETTLEMENT",
        entityId: result.settlementId,
        tripId: result.tripId,
        countryId: result.countryId,
        summary: `${session.user.name} ${verb} ${result.currency} ${result.amount.toFixed(2)} settlement payment.${result.reason ? ` Reason: ${result.reason}` : ""}`,
      }),
      otherUserIds.length
        ? sendPushToUsers(
            otherUserIds,
            "PAYMENTS",
            {
              title:
                result.status === "CANCELLED"
                  ? "Payment cancelled"
                  : "Payment reversed",
              body: `${session.user.name} ${verb} ${result.currency} ${result.amount.toFixed(2)}. The outstanding balance has been restored.`,
              url: `/settlements?tripId=${encodeURIComponent(result.tripId)}`,
              countryId: result.countryId,
              tag: `settlement-reversal-${result.settlementId}`,
            },
          )
        : Promise.resolve(),
    ]);

    return Response.json({
      ok: true,
      settlementId: result.settlementId,
      status: result.status,
      restoredOutstanding: true,
    });
  } catch (error) {
    if (error instanceof SettlementReversalError) {
      return Response.json(
        {
          error: error.message,
          ...(error.code ? { code: error.code } : {}),
        },
        { status: error.status },
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Unable to reverse payment.";

    return Response.json(
      { error: message },
      { status: 400 },
    );
  }
}
