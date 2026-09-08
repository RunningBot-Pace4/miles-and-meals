import { and, eq } from "drizzle-orm";
import { createTransactionalDatabase } from "@/db/transaction";
import { settlements, trips } from "@/db/schema";
import {
  canAccessCountry,
  getCountryWithTrip,
} from "@/lib/access";
import { recordActivity } from "@/lib/activity";
import {
  isTrustedMutationRequest,
  mutationRejectedResponse,
} from "@/lib/request-security";
import { getSession } from "@/lib/session";
import { sendPushToUsers } from "@/lib/push";
import { buildCountrySettlementLedger } from "@/lib/settlement-ledger";
import { settlementActionSchema } from "@/lib/validation";

export const runtime = "nodejs";

class SettlementMutationError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

function amountsMatch(
  storedAmount: string,
  requestedAmount: number | undefined,
): boolean {
  return (
    requestedAmount === undefined ||
    Math.abs(Number(storedAmount) - requestedAmount) < 0.009
  );
}

async function runBestEffortSideEffects(
  tasks: Array<Promise<unknown>>,
): Promise<void> {
  await Promise.allSettled(tasks);
}

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

  try {
    const input = settlementActionSchema.parse(
      await request.json(),
    );

    if (!(await canAccessCountry(session.user, input.countryId))) {
      return Response.json(
        { error: "Forbidden" },
        { status: 403 },
      );
    }

    if (input.counterpartyUserId === session.user.id) {
      return Response.json(
        { error: "A traveler cannot settle with themselves." },
        { status: 400 },
      );
    }

    const country = await getCountryWithTrip(input.countryId);

    if (!country) {
      return Response.json(
        { error: "Country not found." },
        { status: 404 },
      );
    }

    const transactional = createTransactionalDatabase();
    let result:
      | {
          kind: "idempotent";
          settlementId: string;
          status: "SENT" | "SETTLED";
          payerAutoUpdated?: boolean;
        }
      | {
          kind: "markedPaid";
          settlementId: string;
          amount: number;
          currency: string;
          tripId: string;
          countryId: string;
        }
      | {
          kind: "confirmedReceived";
          settlementId: string;
          tripId: string;
          countryId: string;
        }
      | {
          kind: "markedReceived";
          settlementId: string;
          amount: number;
          currency: string;
          tripId: string;
          countryId: string;
        };

    try {
      result = await transactional.database.transaction(
        async (tx) => {
          const lockedTrip = (
            await tx
              .select({ id: trips.id })
              .from(trips)
              .where(eq(trips.id, country.tripId))
              .for("update")
          )[0];

          if (!lockedTrip) {
            throw new SettlementMutationError(
              "Trip not found.",
              404,
            );
          }

          if (input.requestId) {
            const existingRequest = (
              await tx
                .select()
                .from(settlements)
                .where(eq(settlements.id, input.requestId))
                .limit(1)
            )[0];

            if (existingRequest) {
              const commonMatch =
                existingRequest.tripId === country.tripId &&
                existingRequest.countryId === input.countryId &&
                existingRequest.initiatedBy === session.user.id &&
                amountsMatch(existingRequest.amount, input.amount);

              const actionMatch =
                input.action === "MARK_PAID"
                  ? existingRequest.fromUserId === session.user.id &&
                    existingRequest.toUserId ===
                      input.counterpartyUserId &&
                    ["SENT", "SETTLED"].includes(
                      existingRequest.status,
                    )
                  : existingRequest.fromUserId ===
                      input.counterpartyUserId &&
                    existingRequest.toUserId === session.user.id &&
                    existingRequest.status === "SETTLED";

              if (!commonMatch || !actionMatch) {
                throw new SettlementMutationError(
                  "This payment request ID was already used for different settlement details.",
                  409,
                  "REQUEST_ID_CONFLICT",
                );
              }

              return {
                kind: "idempotent" as const,
                settlementId: existingRequest.id,
                status:
                  existingRequest.status === "SETTLED"
                    ? ("SETTLED" as const)
                    : ("SENT" as const),
                payerAutoUpdated:
                  input.action === "MARK_RECEIVED"
                    ? true
                    : undefined,
              };
            }
          }

          const ledger = await buildCountrySettlementLedger(
            input.countryId,
          );

          if (!ledger) {
            throw new SettlementMutationError(
              "Country not found.",
              404,
            );
          }

          if (input.action === "MARK_PAID") {
            const existingPending =
              ledger.pendingSettlements.find(
                (row) =>
                  row.fromUserId === session.user.id &&
                  row.toUserId === input.counterpartyUserId,
              );

            if (existingPending) {
              return {
                kind: "idempotent" as const,
                settlementId: existingPending.id,
                status: "SENT" as const,
              };
            }

            const transfer = ledger.waitingTransfers.find(
              (row) =>
                row.fromUserId === session.user.id &&
                row.toUserId === input.counterpartyUserId,
            );

            if (!transfer) {
              const existingSettled =
                ledger.settledSettlements.find(
                  (row) =>
                    row.fromUserId === session.user.id &&
                    row.toUserId === input.counterpartyUserId,
                );

              if (existingSettled) {
                return {
                  kind: "idempotent" as const,
                  settlementId: existingSettled.id,
                  status: "SETTLED" as const,
                };
              }

              throw new SettlementMutationError(
                "There is no unpaid balance to mark as paid for this traveler.",
                409,
              );
            }

            const paymentAmount = input.amount ?? transfer.amount;

            if (paymentAmount > transfer.amount + 0.009) {
              throw new SettlementMutationError(
                `Payment cannot exceed the outstanding ${ledger.currency} ${transfer.amount.toFixed(2)}.`,
                400,
              );
            }

            const inserted = await tx
              .insert(settlements)
              .values({
                ...(input.requestId
                  ? { id: input.requestId }
                  : {}),
                tripId: ledger.tripId,
                countryId: ledger.countryId,
                fromUserId: session.user.id,
                toUserId: input.counterpartyUserId,
                amount: paymentAmount.toFixed(2),
                currency: ledger.currency,
                status: "SENT",
                initiatedBy: session.user.id,
              })
              .returning({ id: settlements.id });
            const settlementId = inserted[0]?.id;

            if (!settlementId) {
              throw new Error("Unable to record payment.");
            }

            return {
              kind: "markedPaid" as const,
              settlementId,
              amount: paymentAmount,
              currency: ledger.currency,
              tripId: ledger.tripId,
              countryId: ledger.countryId,
            };
          }

          const pending = ledger.pendingSettlements.find(
            (row) =>
              row.fromUserId === input.counterpartyUserId &&
              row.toUserId === session.user.id,
          );

          if (pending) {
            const confirmed = await tx
              .update(settlements)
              .set({
                status: "SETTLED",
                confirmedBy: session.user.id,
                confirmedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(settlements.id, pending.id),
                  eq(settlements.status, "SENT"),
                ),
              )
              .returning({ id: settlements.id });

            if (!confirmed[0]) {
              throw new SettlementMutationError(
                "This payment changed before it could be confirmed. Refresh and try again.",
                409,
                "STALE_SETTLEMENT",
              );
            }

            return {
              kind: "confirmedReceived" as const,
              settlementId: pending.id,
              tripId: ledger.tripId,
              countryId: ledger.countryId,
            };
          }

          const transfer = ledger.waitingTransfers.find(
            (row) =>
              row.fromUserId === input.counterpartyUserId &&
              row.toUserId === session.user.id,
          );

          if (!transfer) {
            const alreadySettled =
              ledger.settledSettlements.find(
                (row) =>
                  row.fromUserId === input.counterpartyUserId &&
                  row.toUserId === session.user.id,
              );

            if (alreadySettled) {
              return {
                kind: "idempotent" as const,
                settlementId: alreadySettled.id,
                status: "SETTLED" as const,
                payerAutoUpdated: true,
              };
            }

            throw new SettlementMutationError(
              "There is no outstanding balance to mark as received for this traveler.",
              409,
            );
          }

          const receivedAmount = input.amount ?? transfer.amount;

          if (receivedAmount > transfer.amount + 0.009) {
            throw new SettlementMutationError(
              `Received amount cannot exceed the outstanding ${ledger.currency} ${transfer.amount.toFixed(2)}.`,
              400,
            );
          }

          const now = new Date();
          const inserted = await tx
            .insert(settlements)
            .values({
              ...(input.requestId
                ? { id: input.requestId }
                : {}),
              tripId: ledger.tripId,
              countryId: ledger.countryId,
              fromUserId: input.counterpartyUserId,
              toUserId: session.user.id,
              amount: receivedAmount.toFixed(2),
              currency: ledger.currency,
              status: "SETTLED",
              initiatedBy: session.user.id,
              confirmedBy: session.user.id,
              sentAt: now,
              confirmedAt: now,
            })
            .returning({ id: settlements.id });
          const settlementId = inserted[0]?.id;

          if (!settlementId) {
            throw new Error("Unable to record received payment.");
          }

          return {
            kind: "markedReceived" as const,
            settlementId,
            amount: receivedAmount,
            currency: ledger.currency,
            tripId: ledger.tripId,
            countryId: ledger.countryId,
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
        ...(result.payerAutoUpdated
          ? { payerAutoUpdated: true }
          : {}),
        idempotent: true,
      });
    }

    if (result.kind === "markedPaid") {
      await runBestEffortSideEffects([
        recordActivity({
          actorUserId: session.user.id,
          action: "MARKED_PAID",
          entityType: "SETTLEMENT",
          entityId: result.settlementId,
          tripId: result.tripId,
          countryId: result.countryId,
          summary: `${session.user.name} marked ${result.currency} ${result.amount.toFixed(2)} as paid.`,
        }),
        sendPushToUsers(
          [input.counterpartyUserId],
          "PAYMENTS",
          {
            title: "Payment marked as paid",
            body: `${session.user.name} marked ${result.currency} ${result.amount.toFixed(2)} as paid.`,
            url: `/settlements?tripId=${encodeURIComponent(result.tripId)}`,
            countryId: result.countryId,
            tag: `settlement-${result.settlementId}`,
          },
        ),
      ]);

      return Response.json({
        ok: true,
        settlementId: result.settlementId,
        status: "SENT",
      });
    }

    if (result.kind === "confirmedReceived") {
      await runBestEffortSideEffects([
        recordActivity({
          actorUserId: session.user.id,
          action: "CONFIRMED_RECEIVED",
          entityType: "SETTLEMENT",
          entityId: result.settlementId,
          tripId: result.tripId,
          countryId: result.countryId,
          summary: `${session.user.name} confirmed payment received.`,
        }),
        sendPushToUsers(
          [input.counterpartyUserId],
          "PAYMENTS",
          {
            title: "Payment completed",
            body: `${session.user.name} confirmed your payment was received. Your payment is now completed automatically.`,
            url: `/settlements?tripId=${encodeURIComponent(result.tripId)}`,
            countryId: result.countryId,
            tag: `settlement-${result.settlementId}`,
          },
        ),
      ]);

      return Response.json({
        ok: true,
        settlementId: result.settlementId,
        status: "SETTLED",
        payerAutoUpdated: true,
      });
    }

    await runBestEffortSideEffects([
      recordActivity({
        actorUserId: session.user.id,
        action: "MARKED_RECEIVED",
        entityType: "SETTLEMENT",
        entityId: result.settlementId,
        tripId: result.tripId,
        countryId: result.countryId,
        summary: `${session.user.name} marked ${result.currency} ${result.amount.toFixed(2)} as received; the payer side was completed automatically.`,
      }),
      sendPushToUsers(
        [input.counterpartyUserId],
        "PAYMENTS",
        {
          title: "Payment completed",
          body: `${session.user.name} marked ${result.currency} ${result.amount.toFixed(2)} as received. Your payment was marked completed automatically.`,
          url: `/settlements?tripId=${encodeURIComponent(result.tripId)}`,
          countryId: result.countryId,
          tag: `settlement-${result.settlementId}`,
        },
      ),
    ]);

    return Response.json({
      ok: true,
      settlementId: result.settlementId,
      status: "SETTLED",
      payerAutoUpdated: true,
    });
  } catch (error) {
    if (error instanceof SettlementMutationError) {
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
        : "Unable to update settlement.";

    return Response.json(
      { error: message },
      { status: 400 },
    );
  }
}
