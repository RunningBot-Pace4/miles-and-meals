import { eq } from "drizzle-orm";
import { db } from "@/db";
import { createTransactionalDatabase } from "@/db/transaction";
import { expenses, trips } from "@/db/schema";
import { canAccessCountry } from "@/lib/access";
import {
  isTrustedMutationRequest,
  mutationRejectedResponse,
} from "@/lib/request-security";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

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

  const { id } = await context.params;
  const expense = (
    await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, id))
      .limit(1)
  )[0];

  if (
    !expense ||
    !(await canAccessCountry(
      session.user,
      expense.countryId,
    ))
  ) {
    return Response.json(
      { error: "Expense not found." },
      { status: 404 },
    );
  }

  const transactional = createTransactionalDatabase();

  try {
    const result =
      await transactional.database.transaction(
        async (tx) => {
          const trip = (
            await tx
              .select({
                financialStatus:
                  trips.financialStatus,
              })
              .from(trips)
              .where(eq(trips.id, expense.tripId))
              .for("update")
          )[0];

          if (!trip) {
            return { status: 404 as const };
          }

          if (
            trip.financialStatus === "CLOSED"
          ) {
            return { status: 423 as const };
          }

          const updated = await tx
            .update(expenses)
            .set({
              receiptReviewStatus: "REVIEWED",
              receiptReviewedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(expenses.id, id))
            .returning({ id: expenses.id });

          return updated[0]
            ? { status: 200 as const }
            : { status: 404 as const };
        },
      );

    if (result.status === 423) {
      return Response.json(
        {
          error:
            "Trip expenses are locked for final settlement. Ask the Trip Owner to reopen the financial ledger before reviewing receipts.",
          code: "TRIP_FINANCIALS_CLOSED",
        },
        { status: 423 },
      );
    }

    if (result.status === 404) {
      return Response.json(
        { error: "Expense not found." },
        { status: 404 },
      );
    }

    return Response.json({ ok: true });
  } finally {
    await transactional.close();
  }
}
