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
      const transfer = ledger.waitingTransfers.find(
        (row) =>
          row.fromUserId === session.user.id &&
          row.toUserId === input.counterpartyUserId,
      );

      if (!transfer) {
        return Response.json(
          {
            error:
              "There is no unpaid balance to mark as paid for this traveler.",
          },
          { status: 409 },
        );
      }

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
        });
      }

      const inserted = await db
        .insert(settlements)
        .values({
          tripId: ledger.tripId,
          countryId: ledger.countryId,
          fromUserId: session.user.id,
          toUserId: input.counterpartyUserId,
          amount: transfer.amount.toFixed(2),
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
        summary: `${session.user.name} marked ${ledger.currency} ${transfer.amount.toFixed(2)} as paid.`,
      });

      await sendPushToUsers(
        [input.counterpartyUserId],
        "PAYMENTS",
        {
          title: "Payment marked as paid",
          body: `${session.user.name} marked ${ledger.currency} ${transfer.amount.toFixed(2)} as paid.`,
          url: "/settlements",
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
          title: "Payment confirmed",
          body: `${session.user.name} confirmed your payment was received.`,
          url: "/settlements",
          tag: `settlement-${pending.id}`,
        },
      );

      return Response.json({
        ok: true,
        settlementId: pending.id,
        status: "SETTLED",
      });
    }

    const transfer = ledger.waitingTransfers.find(
      (row) =>
        row.fromUserId === input.counterpartyUserId &&
        row.toUserId === session.user.id,
    );

    if (!transfer) {
      return Response.json(
        {
          error:
            "There is no outstanding balance to mark as received for this traveler.",
        },
        { status: 409 },
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
        amount: transfer.amount.toFixed(2),
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
      summary: `${session.user.name} marked ${ledger.currency} ${transfer.amount.toFixed(2)} as received.`,
    });

    await sendPushToUsers(
      [input.counterpartyUserId],
      "PAYMENTS",
      {
        title: "Payment received",
        body: `${session.user.name} marked ${ledger.currency} ${transfer.amount.toFixed(2)} as received.`,
        url: "/settlements",
        tag: `settlement-${inserted[0]?.id ?? "received"}`,
      },
    );

    return Response.json({
      ok: true,
      settlementId: inserted[0]?.id,
      status: "SETTLED",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update settlement.";

    return Response.json({ error: message }, { status: 400 });
  }
}
