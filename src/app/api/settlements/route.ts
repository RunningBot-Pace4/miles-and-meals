import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { settlements } from "@/db/schema";
import { canAccessCountry } from "@/lib/access";
import { isTrustedMutationRequest, mutationRejectedResponse } from "@/lib/request-security";
import { getSession } from "@/lib/session";
import { recordActivity } from "@/lib/activity";
import { sendPushToUsers } from "@/lib/push";
import { buildCountrySettlementLedger } from "@/lib/settlement-ledger";
import { settlementActionSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) {
    return mutationRejectedResponse();
  }

  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const input = settlementActionSchema.parse(await request.json());

    if (!(await canAccessCountry(session.user, input.countryId))) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    if (input.counterpartyUserId === session.user.id) {
      return Response.json(
        { error: "A traveler cannot settle with themselves." },
        { status: 400 },
      );
    }

    const ledger = await buildCountrySettlementLedger(input.countryId);

    if (!ledger) {
      return Response.json({ error: "Country not found." }, { status: 404 });
    }

    if (input.action === "MARK_PAID") {
      const existingPending = ledger.pendingSettlements.find(
        (row) =>
          row.fromUserId === session.user.id &&
          row.toUserId === input.counterpartyUserId,
      );

      if (existingPending) {
        return Response.json({
          ok: true,
          settlementId: existingPending.id,
          status: "SENT",
          idempotent: true,
        });
      }

      const transfer = ledger.waitingTransfers.find(
        (row) =>
          row.fromUserId === session.user.id &&
          row.toUserId === input.counterpartyUserId,
      );

      if (!transfer) {
        const existingSettled = ledger.settledSettlements.find(
          (row) =>
            row.fromUserId === session.user.id &&
            row.toUserId === input.counterpartyUserId,
        );

        if (existingSettled) {
          return Response.json({
            ok: true,
            settlementId: existingSettled.id,
            status: "SETTLED",
            idempotent: true,
          });
        }

        return Response.json(
          {
            error:
              "There is no unpaid balance to mark as paid for this traveler.",
          },
          { status: 409 },
        );
      }

      const paymentAmount = input.amount ?? transfer.amount;
      if (paymentAmount > transfer.amount + 0.009) {
        return Response.json(
          { error: `Payment cannot exceed the outstanding ${ledger.currency} ${transfer.amount.toFixed(2)}.` },
          { status: 400 },
        );
      }

      const inserted = await db
        .insert(settlements)
        .values({
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

      await recordActivity({
        actorUserId: session.user.id,
        action: "MARKED_PAID",
        entityType: "SETTLEMENT",
        entityId: inserted[0]?.id ?? null,
        tripId: ledger.tripId,
        countryId: ledger.countryId,
        summary: `${session.user.name} marked ${ledger.currency} ${paymentAmount.toFixed(2)} as paid.`,
      });

      await sendPushToUsers(
        [input.counterpartyUserId],
        "PAYMENTS",
        {
          title: "Payment marked as paid",
          body: `${session.user.name} marked ${ledger.currency} ${paymentAmount.toFixed(2)} as paid.`,
          url: `/settlements?tripId=${encodeURIComponent(ledger.tripId)}`,
          countryId: ledger.countryId,
          tag: `settlement-${inserted[0]?.id ?? "sent"}`,
        },
      );

      return Response.json({
        ok: true,
        settlementId: inserted[0]?.id,
        status: "SENT",
      });
    }

    const pending = ledger.pendingSettlements.find(
      (row) =>
        row.fromUserId === input.counterpartyUserId &&
        row.toUserId === session.user.id,
    );

    if (pending) {
      await db
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
        );

      await recordActivity({
        actorUserId: session.user.id,
        action: "CONFIRMED_RECEIVED",
        entityType: "SETTLEMENT",
        entityId: pending.id,
        tripId: ledger.tripId,
        countryId: ledger.countryId,
        summary: `${session.user.name} confirmed payment received.`,
      });

      await sendPushToUsers(
        [input.counterpartyUserId],
        "PAYMENTS",
        {
          title: "Payment completed",
          body: `${session.user.name} confirmed your payment was received. Your payment is now completed automatically.`,
          url: `/settlements?tripId=${encodeURIComponent(ledger.tripId)}`,
          countryId: ledger.countryId,
          tag: `settlement-${pending.id}`,
        },
      );

      return Response.json({
        ok: true,
        settlementId: pending.id,
        status: "SETTLED",
        payerAutoUpdated: true,
      });
    }

    const transfer = ledger.waitingTransfers.find(
      (row) =>
        row.fromUserId === input.counterpartyUserId &&
        row.toUserId === session.user.id,
    );

    if (!transfer) {
      const alreadySettled = ledger.settledSettlements.find(
        (row) =>
          row.fromUserId === input.counterpartyUserId &&
          row.toUserId === session.user.id,
      );

      if (alreadySettled) {
        return Response.json({
          ok: true,
          settlementId: alreadySettled.id,
          status: "SETTLED",
          payerAutoUpdated: true,
          idempotent: true,
        });
      }

      return Response.json(
        {
          error:
            "There is no outstanding balance to mark as received for this traveler.",
        },
        { status: 409 },
      );
    }

    const receivedAmount = input.amount ?? transfer.amount;
    if (receivedAmount > transfer.amount + 0.009) {
      return Response.json(
        { error: `Received amount cannot exceed the outstanding ${ledger.currency} ${transfer.amount.toFixed(2)}.` },
        { status: 400 },
      );
    }

    const now = new Date();
    const inserted = await db
      .insert(settlements)
      .values({
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

    await recordActivity({
      actorUserId: session.user.id,
      action: "MARKED_RECEIVED",
      entityType: "SETTLEMENT",
      entityId: inserted[0]?.id ?? null,
      tripId: ledger.tripId,
      countryId: ledger.countryId,
      summary: `${session.user.name} marked ${ledger.currency} ${receivedAmount.toFixed(2)} as received; the payer side was completed automatically.`,
    });

    await sendPushToUsers(
      [input.counterpartyUserId],
      "PAYMENTS",
      {
        title: "Payment completed",
        body: `${session.user.name} marked ${ledger.currency} ${receivedAmount.toFixed(2)} as received. Your payment was marked completed automatically.`,
        url: `/settlements?tripId=${encodeURIComponent(ledger.tripId)}`,
        countryId: ledger.countryId,
        tag: `settlement-${inserted[0]?.id ?? "received"}`,
      },
    );

    return Response.json({
      ok: true,
      settlementId: inserted[0]?.id,
      status: "SETTLED",
      payerAutoUpdated: true,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update settlement.";

    return Response.json({ error: message }, { status: 400 });
  }
}
