import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { createTransactionalDatabase } from "@/db/transaction";
import {
  expenseItemAssignments,
  expenseItems,
  expensePayers,
  expenseSplits,
  expenses,
  trips,
} from "@/db/schema";
import { getActiveTripContext } from "@/lib/active-trip";
import {
  canAccessCountry,
  getCountryWithTrip,
  listCountryMembers,
} from "@/lib/access";
import { recordActivity } from "@/lib/activity";
import {
  expenseDerivedRowsMatch,
  expenseParentMatches,
  type ExpenseParentSignature,
} from "@/lib/expense-idempotency";
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
import { expenseSchema } from "@/lib/validation";

export const runtime = "nodejs";

// The FOR UPDATE transaction replaces the legacy expenseLedgerLockedResponse
// pre-check so close-vs-expense races cannot pass between check and write.

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

function expenseLockedError() {
  return new ExpenseMutationError(
    "Trip expenses are locked for final settlement. Ask the Trip Owner to reopen the financial ledger before adding, editing or deleting expenses.",
    423,
    "TRIP_FINANCIALS_CLOSED",
  );
}

function expectedParent(input: {
  tripId: string;
  countryId: string;
  expenseDate: string;
  category: string;
  description: string;
  transactionCurrency: string;
  transactionAmount: number;
  exchangeRate: number;
  rateType: string;
  baseCurrency: string;
  convertedAmount: number;
  actualConvertedAmount: number | null;
  splitMode: string;
  paidByUserId: string;
  paymentMethod: string;
  receiptUrl: string;
  receiptReviewStatus: string;
  receiptConfidence: number | null | undefined;
  notes: string;
  createdBy: string;
}): ExpenseParentSignature {
  return {
    tripId: input.tripId,
    countryId: input.countryId,
    expenseDate: input.expenseDate,
    category: input.category,
    description: input.description,
    transactionCurrency: input.transactionCurrency,
    transactionAmount: input.transactionAmount.toFixed(2),
    exchangeRate: input.exchangeRate.toFixed(10),
    rateType: input.rateType,
    baseCurrency: input.baseCurrency,
    convertedAmount: input.convertedAmount.toFixed(2),
    actualConvertedAmount:
      input.actualConvertedAmount === null
        ? null
        : input.actualConvertedAmount.toFixed(2),
    splitMode: input.splitMode,
    paidByUserId: input.paidByUserId,
    paymentMethod: input.paymentMethod || null,
    receiptUrl: input.receiptUrl || null,
    receiptReviewStatus: input.receiptUrl
      ? input.receiptReviewStatus
      : "NOT_REQUIRED",
    receiptConfidence: input.receiptConfidence ?? null,
    notes: input.notes || null,
    createdBy: input.createdBy,
  };
}

async function runBestEffortSideEffects(
  tasks: Array<Promise<unknown>>,
): Promise<void> {
  await Promise.allSettled(tasks);
}

export async function GET() {
  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activeTrip = await getActiveTripContext(session.user);
  const ids = activeTrip.countries.map((country) => country.id);

  if (ids.length === 0) {
    return Response.json({ expenses: [] });
  }

  const rows = await db
    .select()
    .from(expenses)
    .where(inArray(expenses.countryId, ids))
    .orderBy(desc(expenses.expenseDate), desc(expenses.createdAt));

  return Response.json({ expenses: rows });
}

export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) {
    return mutationRejectedResponse();
  }

  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const input = expenseSchema.parse(await request.json());

    if (!(await canAccessCountry(session.user, input.countryId))) {
      return Response.json(
        {
          error:
            "You no longer have access to this Trip. Ask the Trip Owner to add you again, or discard this offline change.",
          code: "TRIP_ACCESS_REMOVED",
        },
        { status: 403 },
      );
    }

    const country = await getCountryWithTrip(input.countryId);

    if (!country) {
      return Response.json({ error: "Country not found." }, { status: 404 });
    }

    const members = await listCountryMembers(
      input.countryId,
      session.user.id,
    );
    const memberIds = new Set(members.map((member) => member.id));

    if (!memberIds.has(input.paidByUserId)) {
      return Response.json(
        { error: "The payer is not assigned to this country." },
        { status: 400 },
      );
    }

    if (input.payers.some((payer) => !memberIds.has(payer.userId))) {
      return Response.json(
        { error: "Every payer must be assigned to this Trip." },
        { status: 400 },
      );
    }

    if (input.splits.some((split) => !memberIds.has(split.userId))) {
      return Response.json(
        { error: "Every split member must be assigned to this country." },
        { status: 400 },
      );
    }

    if (
      input.itemization.some((item) =>
        item.assigneeUserIds.some((userId) => !memberIds.has(userId)),
      )
    ) {
      return Response.json(
        {
          error:
            "Every receipt item traveler must be assigned to this trip.",
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
    const actualConvertedAmount =
      !baseCurrencyTransaction &&
      input.rateType === "CREDIT_CARD" &&
      typeof input.actualConvertedAmount === "number" &&
      input.actualConvertedAmount > 0
        ? input.actualConvertedAmount
        : null;
    const baseAmount = convertedAmount(
      input.transactionAmount,
      appliedExchangeRate,
    );
    const settlementBase = actualConvertedAmount ?? baseAmount;
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
    const parentSignature = expectedParent({
      tripId: country.tripId,
      countryId: input.countryId,
      expenseDate: input.expenseDate,
      category: input.category,
      description: input.description,
      transactionCurrency: input.transactionCurrency,
      transactionAmount: input.transactionAmount,
      exchangeRate: appliedExchangeRate,
      rateType: appliedRateType,
      baseCurrency: country.baseCurrency,
      convertedAmount: baseAmount,
      actualConvertedAmount,
      splitMode: itemization ? "EXACT" : input.splitMode,
      paidByUserId: input.paidByUserId,
      paymentMethod: input.paymentMethod,
      receiptUrl: input.receiptUrl,
      receiptReviewStatus: input.receiptReviewStatus,
      receiptConfidence: input.receiptConfidence,
      notes: input.notes,
      createdBy: session.user.id,
    });

    const canAddExpenses = (
      await getTripCapabilities(
        session.user,
        country.tripId,
      )
    ).canAddExpenses;

    const transactional = createTransactionalDatabase();
    let mutation:
      | { kind: "created"; id: string }
      | { kind: "idempotent"; id: string }
      | { kind: "recovered"; id: string };

    try {
      mutation = await transactional.database.transaction(async (tx) => {
        const lockedTrips = await tx
          .select({
            id: trips.id,
            financialStatus: trips.financialStatus,
          })
          .from(trips)
          .where(eq(trips.id, country.tripId))
          .for("update");

        const lockedTrip = lockedTrips[0];

        if (!lockedTrip) {
          throw new ExpenseMutationError(
            "Trip not found.",
            404,
          );
        }

        const priorRequest = input.clientRequestId
          ? (
              await tx
                .select({
                  id: expenses.id,
                  tripId: expenses.tripId,
                  countryId: expenses.countryId,
                  expenseDate: expenses.expenseDate,
                  category: expenses.category,
                  description: expenses.description,
                  transactionCurrency: expenses.transactionCurrency,
                  transactionAmount: expenses.transactionAmount,
                  exchangeRate: expenses.exchangeRate,
                  rateType: expenses.rateType,
                  baseCurrency: expenses.baseCurrency,
                  convertedAmount: expenses.convertedAmount,
                  actualConvertedAmount: expenses.actualConvertedAmount,
                  splitMode: expenses.splitMode,
                  paidByUserId: expenses.paidByUserId,
                  paymentMethod: expenses.paymentMethod,
                  receiptUrl: expenses.receiptUrl,
                  receiptReviewStatus: expenses.receiptReviewStatus,
                  receiptConfidence: expenses.receiptConfidence,
                  notes: expenses.notes,
                  createdBy: expenses.createdBy,
                })
                .from(expenses)
                .where(eq(expenses.id, input.clientRequestId))
                .limit(1)
            )[0] ?? null
          : null;

        if (priorRequest) {
          if (
            priorRequest.createdBy !== session.user.id ||
            priorRequest.countryId !== input.countryId ||
            !expenseParentMatches(
              priorRequest,
              parentSignature,
            )
          ) {
            throw new ExpenseMutationError(
              "This save request conflicts with an existing expense.",
              409,
              "REQUEST_ID_CONFLICT",
            );
          }

          const storedSplits = await tx
            .select({
              userId: expenseSplits.userId,
              shareAmountBase: expenseSplits.shareAmountBase,
            })
            .from(expenseSplits)
            .where(eq(expenseSplits.expenseId, priorRequest.id));
          const storedPayers = await tx
            .select({
              userId: expensePayers.userId,
              amountBase: expensePayers.amountBase,
            })
            .from(expensePayers)
            .where(eq(expensePayers.expenseId, priorRequest.id));
          const storedItems = await tx
            .select({
              id: expenseItems.id,
              title: expenseItems.title,
              transactionAmount: expenseItems.transactionAmount,
              baseAmount: expenseItems.baseAmount,
            })
            .from(expenseItems)
            .where(eq(expenseItems.expenseId, priorRequest.id));
          const storedAssignments = storedItems.length
            ? await tx
                .select({
                  itemId: expenseItemAssignments.itemId,
                  userId: expenseItemAssignments.userId,
                  shareAmountBase:
                    expenseItemAssignments.shareAmountBase,
                })
                .from(expenseItemAssignments)
                .where(
                  inArray(
                    expenseItemAssignments.itemId,
                    storedItems.map((item) => item.id),
                  ),
                )
            : [];

          if (
            expenseDerivedRowsMatch({
              storedSplits,
              expectedSplits: calculatedSplits,
              storedPayers,
              expectedPayers: calculatedPayers,
              storedItems,
              storedAssignments,
              expectedItemization: itemization,
            })
          ) {
            return {
              kind: "idempotent" as const,
              id: priorRequest.id,
            };
          }

          await tx
            .delete(expenseSplits)
            .where(eq(expenseSplits.expenseId, priorRequest.id));
          await tx.insert(expenseSplits).values(
            calculatedSplits.map((split) => ({
              expenseId: priorRequest.id,
              ...split,
            })),
          );

          await tx
            .delete(expensePayers)
            .where(eq(expensePayers.expenseId, priorRequest.id));
          await tx.insert(expensePayers).values(
            calculatedPayers.map((payer) => ({
              expenseId: priorRequest.id,
              ...payer,
            })),
          );

          await tx
            .delete(expenseItems)
            .where(eq(expenseItems.expenseId, priorRequest.id));
          if (itemization) {
            for (const item of itemization.items) {
              const createdItems = await tx
                .insert(expenseItems)
                .values({
                  expenseId: priorRequest.id,
                  title: item.title,
                  transactionAmount:
                    item.transactionAmount.toFixed(2),
                  baseAmount: item.baseAmount.toFixed(2),
                })
                .returning({ id: expenseItems.id });
              const itemId = createdItems[0]?.id;

              if (!itemId) {
                throw new Error(
                  "Unable to save receipt itemization.",
                );
              }

              if (item.assignments.length) {
                await tx.insert(expenseItemAssignments).values(
                  item.assignments.map((assignment) => ({
                    itemId,
                    userId: assignment.userId,
                    shareAmountBase:
                      assignment.shareAmountBase,
                  })),
                );
              }
            }
          }

          return {
            kind: "recovered" as const,
            id: priorRequest.id,
          };
        }

        if (!canAddExpenses) {
          throw new ExpenseMutationError(
            "You have view-only access to this Trip's finances.",
            403,
          );
        }

        if (lockedTrip.financialStatus === "CLOSED") {
          throw expenseLockedError();
        }

        if (!input.allowDuplicate) {
          const sameDay = await tx
            .select({
              id: expenses.id,
              description: expenses.description,
              transactionCurrency:
                expenses.transactionCurrency,
              transactionAmount: expenses.transactionAmount,
              createdAt: expenses.createdAt,
            })
            .from(expenses)
            .where(
              and(
                eq(expenses.countryId, input.countryId),
                eq(expenses.expenseDate, input.expenseDate),
              ),
            )
            .orderBy(desc(expenses.createdAt))
            .limit(40);

          const normalizedDescription = input.description
            .trim()
            .toLowerCase()
            .replace(/\s+/g, " ");
          const duplicate = sameDay.find((row) => {
            const existingDescription = row.description
              .trim()
              .toLowerCase()
              .replace(/\s+/g, " ");
            const sameAmount =
              Math.abs(
                Number(row.transactionAmount) -
                  input.transactionAmount,
              ) < 0.01;
            const sameTransactionCurrency =
              row.transactionCurrency.toUpperCase() ===
              input.transactionCurrency.toUpperCase();
            const sameMerchant =
              existingDescription === normalizedDescription ||
              (existingDescription.length >= 5 &&
                normalizedDescription.length >= 5 &&
                (existingDescription.includes(
                  normalizedDescription,
                ) ||
                  normalizedDescription.includes(
                    existingDescription,
                  )));

            return (
              sameAmount &&
              sameTransactionCurrency &&
              sameMerchant
            );
          });

          if (duplicate) {
            throw new ExpenseMutationError(
              "Possible duplicate expense.",
              409,
              "POSSIBLE_DUPLICATE",
              {
                duplicate: {
                  id: duplicate.id,
                  description: duplicate.description,
                  currency: duplicate.transactionCurrency,
                  amount: Number(duplicate.transactionAmount),
                },
              },
            );
          }
        }

        const inserted = await tx
          .insert(expenses)
          .values({
            ...(input.clientRequestId
              ? { id: input.clientRequestId }
              : {}),
            tripId: country.tripId,
            countryId: input.countryId,
            expenseDate: input.expenseDate,
            category: input.category,
            description: input.description,
            transactionCurrency: input.transactionCurrency,
            transactionAmount:
              input.transactionAmount.toFixed(2),
            exchangeRate: appliedExchangeRate.toFixed(10),
            rateType: appliedRateType,
            baseCurrency: country.baseCurrency,
            convertedAmount: baseAmount.toFixed(2),
            actualConvertedAmount:
              actualConvertedAmount === null
                ? null
                : actualConvertedAmount.toFixed(2),
            splitMode: itemization ? "EXACT" : input.splitMode,
            paidByUserId: input.paidByUserId,
            paymentMethod: input.paymentMethod || null,
            receiptUrl: input.receiptUrl || null,
            receiptReviewStatus: input.receiptUrl
              ? input.receiptReviewStatus
              : "NOT_REQUIRED",
            receiptConfidence: input.receiptConfidence ?? null,
            receiptReviewedAt:
              input.receiptUrl &&
              input.receiptReviewStatus === "REVIEWED"
                ? new Date()
                : null,
            notes: input.notes || null,
            createdBy: session.user.id,
          })
          .returning({ id: expenses.id });
        const expenseId = inserted[0]?.id;

        if (!expenseId) {
          throw new Error("Unable to create expense.");
        }

        await tx.insert(expenseSplits).values(
          calculatedSplits.map((split) => ({
            expenseId,
            ...split,
          })),
        );
        await tx.insert(expensePayers).values(
          calculatedPayers.map((payer) => ({
            expenseId,
            ...payer,
          })),
        );

        if (itemization) {
          for (const item of itemization.items) {
            const createdItems = await tx
              .insert(expenseItems)
              .values({
                expenseId,
                title: item.title,
                transactionAmount:
                  item.transactionAmount.toFixed(2),
                baseAmount: item.baseAmount.toFixed(2),
              })
              .returning({ id: expenseItems.id });
            const itemId = createdItems[0]?.id;

            if (!itemId) {
              throw new Error(
                "Unable to save receipt itemization.",
              );
            }

            if (item.assignments.length) {
              await tx.insert(expenseItemAssignments).values(
                item.assignments.map((assignment) => ({
                  itemId,
                  userId: assignment.userId,
                  shareAmountBase:
                    assignment.shareAmountBase,
                })),
              );
            }
          }
        }

        return {
          kind: "created" as const,
          id: expenseId,
        };
      });
    } finally {
      await transactional.close();
    }

    if (mutation.kind === "idempotent") {
      return Response.json({
        id: mutation.id,
        idempotent: true,
      });
    }

    if (mutation.kind === "recovered") {
      await runBestEffortSideEffects([
        recordActivity({
          actorUserId: session.user.id,
          action: "RECOVERED",
          entityType: "EXPENSE",
          entityId: mutation.id,
          tripId: country.tripId,
          countryId: input.countryId,
          summary: `${session.user.name} recovered an interrupted expense save: ${input.description}`,
        }),
      ]);

      return Response.json({
        id: mutation.id,
        idempotent: true,
        recovered: true,
      });
    }

    await runBestEffortSideEffects([
      recordActivity({
        actorUserId: session.user.id,
        action: "CREATED",
        entityType: "EXPENSE",
        entityId: mutation.id,
        tripId: country.tripId,
        countryId: input.countryId,
        summary: `${session.user.name} added expense: ${input.description}`,
        metadata: {
          category: input.category,
          amount: input.transactionAmount,
          currency: input.transactionCurrency,
        },
      }),
      sendPushToCountry(
        input.countryId,
        session.user.id,
        "EXPENSES",
        {
          title: "New trip expense",
          body: `${session.user.name} added ${input.transactionCurrency} ${input.transactionAmount.toFixed(2)} · ${input.description}`,
          url: "/expenses",
          tag: `expense-${mutation.id}`,
        },
      ),
    ]);

    return Response.json(
      { id: mutation.id },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ExpenseMutationError) {
      return Response.json(
        {
          error: error.message,
          ...(error.code ? { code: error.code } : {}),
          ...(error.details ?? {}),
        },
        { status: error.status },
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Invalid expense request.";
    return Response.json({ error: message }, { status: 400 });
  }
}
