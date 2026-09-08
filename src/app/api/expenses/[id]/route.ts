import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { createTransactionalDatabase } from "@/db/transaction";
import {
  expenseItemAssignments,
  expenseItems,
  expensePayers,
  expenseSplits,
  expenses,
  settlementExpenseAllocations,
  trips,
} from "@/db/schema";
import {
  canAccessCountry,
  getCountryWithTrip,
  listCountryMembers,
} from "@/lib/access";
import { recordActivity } from "@/lib/activity";
import { buildExpensePayers } from "@/lib/expense-payers";
import {
  buildExpenseSplits,
  convertedAmount,
  effectiveExchangeRate,
  sameCurrency,
} from "@/lib/money";
import {
  buildReceiptItemization,
  type ReceiptItemizationResult,
} from "@/lib/receipt-itemization";
import { sendPushToCountry } from "@/lib/push";
import {
  isTrustedMutationRequest,
  mutationRejectedResponse,
} from "@/lib/request-security";
import { getSession } from "@/lib/session";
import { getTripCapabilities } from "@/lib/trip-capabilities";
import { expenseUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";

// The FOR UPDATE transaction replaces the legacy expenseLedgerLockedResponse
// pre-check so close-vs-expense races cannot pass between check and write.

type Context = {
  params: Promise<{ id: string }>;
};

class ExpenseMutationError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

function lockedExpenseError() {
  return new ExpenseMutationError(
    "Trip expenses are locked for final settlement. Ask the Trip Owner to reopen the financial ledger before adding, editing or deleting expenses.",
    423,
    "TRIP_FINANCIALS_CLOSED",
  );
}

function allocatedExpenseError() {
  return new ExpenseMutationError(
    "This expense already has bill-specific settlement payments and is locked to preserve the payment trail. Create a correcting expense or settlement entry instead of editing or deleting this bill.",
    409,
    "EXPENSE_HAS_SETTLEMENT_ALLOCATIONS",
  );
}

function staleExpenseError(updatedAt: Date) {
  const staleEdit = { code: "STALE_EDIT" as const };

  return new ExpenseMutationError(
    "This expense was changed by another traveler after you opened it. Reload the latest version before saving.",
    409,
    staleEdit.code,
    { currentUpdatedAt: updatedAt.toISOString() },
  );
}

async function getExisting(id: string) {
  const rows = await db
    .select()
    .from(expenses)
    .where(eq(expenses.id, id))
    .limit(1);

  return rows[0] ?? null;
}

async function runBestEffortSideEffects(
  tasks: Array<Promise<unknown>>,
): Promise<void> {
  await Promise.allSettled(tasks);
}

export async function PUT(
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
  const existing = await getExisting(id);

  if (!existing) {
    return Response.json(
      { error: "Expense not found." },
      { status: 404 },
    );
  }

  if (
    !(await canAccessCountry(
      session.user,
      existing.countryId,
    ))
  ) {
    return Response.json(
      {
        error:
          "You no longer have access to this Trip.",
        code: "TRIP_ACCESS_REMOVED",
      },
      { status: 403 },
    );
  }

  try {
    const input = expenseUpdateSchema.parse(
      await request.json(),
    );

    if (
      !(await canAccessCountry(
        session.user,
        input.countryId,
      ))
    ) {
      return Response.json(
        {
          error:
            "You no longer have access to the selected Trip.",
          code: "TRIP_ACCESS_REMOVED",
        },
        { status: 403 },
      );
    }

    const country = await getCountryWithTrip(input.countryId);

    if (!country) {
      return Response.json(
        { error: "Country not found." },
        { status: 404 },
      );
    }

    const [existingCapabilities, targetCapabilities] =
      await Promise.all([
        getTripCapabilities(
          session.user,
          existing.tripId,
        ),
        getTripCapabilities(
          session.user,
          country.tripId,
        ),
      ]);

    if (
      !existingCapabilities.canAddExpenses ||
      !targetCapabilities.canAddExpenses
    ) {
      return Response.json(
        {
          error:
            "You have view-only access to this Trip's finances.",
        },
        { status: 403 },
      );
    }

    const members = await listCountryMembers(
      input.countryId,
      session.user.id,
    );
    const memberIds = new Set(
      members.map((member) => member.id),
    );

    if (
      !memberIds.has(input.paidByUserId) ||
      input.payers.some(
        (payer) => !memberIds.has(payer.userId),
      ) ||
      input.splits.some(
        (split) => !memberIds.has(split.userId),
      ) ||
      input.itemization.some((item) =>
        item.assigneeUserIds.some(
          (userId) => !memberIds.has(userId),
        ),
      )
    ) {
      return Response.json(
        {
          error:
            "Payer, split members and receipt-item travelers must belong to the trip.",
        },
        { status: 400 },
      );
    }

    const baseCurrencyTransaction = sameCurrency(
      input.transactionCurrency,
      country.baseCurrency,
    );
    const appliedExchangeRate = effectiveExchangeRate(
      input.transactionCurrency,
      country.baseCurrency,
      input.exchangeRate,
    );
    const appliedRateType = baseCurrencyTransaction
      ? "DEFAULT"
      : input.rateType;
    const baseAmount = convertedAmount(
      input.transactionAmount,
      appliedExchangeRate,
    );
    const actual =
      !baseCurrencyTransaction &&
      input.rateType === "CREDIT_CARD" &&
      typeof input.actualConvertedAmount === "number" &&
      input.actualConvertedAmount > 0
        ? input.actualConvertedAmount
        : null;
    const settlementBase = actual ?? baseAmount;
    const itemization: ReceiptItemizationResult | null =
      input.itemization.length
        ? buildReceiptItemization(
            input.transactionAmount,
            settlementBase,
            input.itemization,
          )
        : null;
    const calculatedSplits =
      itemization?.splits ??
      buildExpenseSplits(
        settlementBase,
        input.splitMode,
        input.splits,
      );
    const calculatedPayers = buildExpensePayers(
      settlementBase,
      input.paidByUserId,
      input.payers,
    );

    const transactional = createTransactionalDatabase();
    let updatedAt: Date;

    try {
      updatedAt =
        await transactional.database.transaction(
          async (tx) => {
            const tripIds = [
              ...new Set([
                existing.tripId,
                country.tripId,
              ]),
            ].sort();

            const lockedTrips = await tx
              .select({
                id: trips.id,
                financialStatus:
                  trips.financialStatus,
              })
              .from(trips)
              .where(inArray(trips.id, tripIds))
              .orderBy(trips.id)
              .for("update");

            if (lockedTrips.length !== tripIds.length) {
              throw new ExpenseMutationError(
                "Trip not found.",
                404,
              );
            }

            if (
              lockedTrips.some(
                (trip) =>
                  trip.financialStatus === "CLOSED",
              )
            ) {
              throw lockedExpenseError();
            }

            const current = (
              await tx
                .select()
                .from(expenses)
                .where(eq(expenses.id, id))
                .limit(1)
            )[0];

            if (!current) {
              throw new ExpenseMutationError(
                "Expense not found.",
                404,
              );
            }

            const existingAllocation = (
              await tx
                .select({
                  settlementId:
                    settlementExpenseAllocations.settlementId,
                })
                .from(settlementExpenseAllocations)
                .where(
                  eq(
                    settlementExpenseAllocations.expenseId,
                    id,
                  ),
                )
                .limit(1)
            )[0];

            if (existingAllocation) {
              throw allocatedExpenseError();
            }

            if (input.expectedUpdatedAt) {
              const expected = new Date(
                input.expectedUpdatedAt,
              ).getTime();
              const currentTime =
                current.updatedAt.getTime();

              if (
                !Number.isFinite(expected) ||
                Math.abs(
                  expected - currentTime,
                ) > 1
              ) {
                throw staleExpenseError(
                  current.updatedAt,
                );
              }
            }

            const nextUpdatedAt = new Date();
            const updated = await tx
              .update(expenses)
              .set({
                tripId: country.tripId,
                countryId: input.countryId,
                expenseDate: input.expenseDate,
                category: input.category,
                description: input.description,
                transactionCurrency:
                  input.transactionCurrency,
                transactionAmount:
                  input.transactionAmount.toFixed(2),
                exchangeRate:
                  appliedExchangeRate.toFixed(10),
                rateType: appliedRateType,
                baseCurrency: country.baseCurrency,
                convertedAmount:
                  baseAmount.toFixed(2),
                actualConvertedAmount:
                  actual === null
                    ? null
                    : actual.toFixed(2),
                splitMode: itemization
                  ? "EXACT"
                  : input.splitMode,
                paidByUserId: input.paidByUserId,
                paymentMethod:
                  input.paymentMethod || null,
                receiptUrl: input.receiptUrl || null,
                receiptReviewStatus:
                  input.receiptUrl
                    ? input.receiptReviewStatus
                    : "NOT_REQUIRED",
                receiptConfidence:
                  input.receiptConfidence ?? null,
                receiptReviewedAt:
                  input.receiptUrl &&
                  input.receiptReviewStatus ===
                    "REVIEWED"
                    ? new Date()
                    : null,
                notes: input.notes || null,
                updatedAt: nextUpdatedAt,
              })
              .where(
                and(
                  eq(expenses.id, id),
                  eq(
                    expenses.updatedAt,
                    current.updatedAt,
                  ),
                ),
              )
              .returning({
                updatedAt: expenses.updatedAt,
              });

            if (!updated[0]) {
              const latest = (
                await tx
                  .select({
                    updatedAt: expenses.updatedAt,
                  })
                  .from(expenses)
                  .where(eq(expenses.id, id))
                  .limit(1)
              )[0];

              throw staleExpenseError(
                latest?.updatedAt ??
                  current.updatedAt,
              );
            }

            await tx
              .delete(expenseSplits)
              .where(
                eq(expenseSplits.expenseId, id),
              );
            await tx.insert(expenseSplits).values(
              calculatedSplits.map((split) => ({
                expenseId: id,
                ...split,
              })),
            );

            await tx
              .delete(expensePayers)
              .where(
                eq(expensePayers.expenseId, id),
              );
            await tx.insert(expensePayers).values(
              calculatedPayers.map((payer) => ({
                expenseId: id,
                ...payer,
              })),
            );

            await tx
              .delete(expenseItems)
              .where(
                eq(expenseItems.expenseId, id),
              );

            if (itemization) {
              for (const item of itemization.items) {
                const createdItems = await tx
                  .insert(expenseItems)
                  .values({
                    expenseId: id,
                    title: item.title,
                    transactionAmount:
                      item.transactionAmount.toFixed(
                        2,
                      ),
                    baseAmount:
                      item.baseAmount.toFixed(2),
                  })
                  .returning({
                    id: expenseItems.id,
                  });
                const itemId =
                  createdItems[0]?.id;

                if (!itemId) {
                  throw new Error(
                    "Unable to save receipt itemization.",
                  );
                }

                if (item.assignments.length) {
                  await tx
                    .insert(
                      expenseItemAssignments,
                    )
                    .values(
                      item.assignments.map(
                        (assignment) => ({
                          itemId,
                          userId:
                            assignment.userId,
                          shareAmountBase:
                            assignment.shareAmountBase,
                        }),
                      ),
                    );
                }
              }
            }

            return updated[0].updatedAt;
          },
        );
    } finally {
      await transactional.close();
    }

    await runBestEffortSideEffects([
      recordActivity({
        actorUserId: session.user.id,
        action: "UPDATED",
        entityType: "EXPENSE",
        entityId: id,
        tripId: country.tripId,
        countryId: input.countryId,
        summary: `${session.user.name} updated expense: ${input.description}`,
      }),
      sendPushToCountry(
        input.countryId,
        session.user.id,
        "EXPENSES",
        {
          title: "Expense updated",
          body: `${session.user.name} updated ${input.description}.`,
          url: "/expenses",
          tag: `expense-${id}`,
        },
      ),
    ]);

    return Response.json({
      ok: true,
      updatedAt: updatedAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof ExpenseMutationError) {
      return Response.json(
        {
          error: error.message,
          ...(error.code
            ? { code: error.code }
            : {}),
          ...(error.details ?? {}),
        },
        { status: error.status },
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Invalid expense request.";
    return Response.json(
      { error: message },
      { status: 400 },
    );
  }
}

export async function DELETE(
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
  const existing = await getExisting(id);

  if (!existing) {
    return Response.json(
      { error: "Expense not found." },
      { status: 404 },
    );
  }

  if (
    !(await canAccessCountry(
      session.user,
      existing.countryId,
    ))
  ) {
    return Response.json(
      {
        error:
          "You no longer have access to this Trip.",
        code: "TRIP_ACCESS_REMOVED",
      },
      { status: 403 },
    );
  }

  if (
    !(await getTripCapabilities(
      session.user,
      existing.tripId,
    )).canAddExpenses
  ) {
    return Response.json(
      {
        error:
          "You have view-only access to this Trip's finances.",
      },
      { status: 403 },
    );
  }

  try {
    const transactional =
      createTransactionalDatabase();
    let deleted: {
      tripId: string;
      countryId: string;
      description: string;
    };

    try {
      deleted =
        await transactional.database.transaction(
          async (tx) => {
            const lockedTrip = (
              await tx
                .select({
                  id: trips.id,
                  financialStatus:
                    trips.financialStatus,
                })
                .from(trips)
                .where(
                  eq(trips.id, existing.tripId),
                )
                .for("update")
            )[0];

            if (!lockedTrip) {
              throw new ExpenseMutationError(
                "Trip not found.",
                404,
              );
            }

            if (
              lockedTrip.financialStatus ===
              "CLOSED"
            ) {
              throw lockedExpenseError();
            }

            const current = (
              await tx
                .select({
                  tripId: expenses.tripId,
                  countryId: expenses.countryId,
                  description:
                    expenses.description,
                })
                .from(expenses)
                .where(eq(expenses.id, id))
                .limit(1)
            )[0];

            if (!current) {
              throw new ExpenseMutationError(
                "Expense not found.",
                404,
              );
            }

            const existingAllocation = (
              await tx
                .select({
                  settlementId:
                    settlementExpenseAllocations.settlementId,
                })
                .from(settlementExpenseAllocations)
                .where(
                  eq(
                    settlementExpenseAllocations.expenseId,
                    id,
                  ),
                )
                .limit(1)
            )[0];

            if (existingAllocation) {
              throw allocatedExpenseError();
            }

            const removed = await tx
              .delete(expenses)
              .where(eq(expenses.id, id))
              .returning({ id: expenses.id });

            if (!removed[0]) {
              throw new ExpenseMutationError(
                "Expense not found.",
                404,
              );
            }

            return current;
          },
        );
    } finally {
      await transactional.close();
    }

    await runBestEffortSideEffects([
      recordActivity({
        actorUserId: session.user.id,
        action: "DELETED",
        entityType: "EXPENSE",
        entityId: id,
        tripId: deleted.tripId,
        countryId: deleted.countryId,
        summary: `${session.user.name} deleted expense: ${deleted.description}`,
      }),
      sendPushToCountry(
        deleted.countryId,
        session.user.id,
        "EXPENSES",
        {
          title: "Expense removed",
          body: `${session.user.name} removed ${deleted.description}.`,
          url: "/expenses",
          tag: `expense-${id}`,
        },
      ),
    ]);

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof ExpenseMutationError) {
      return Response.json(
        {
          error: error.message,
          ...(error.code
            ? { code: error.code }
            : {}),
        },
        { status: error.status },
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Unable to delete expense.";
    return Response.json(
      { error: message },
      { status: 400 },
    );
  }
}
