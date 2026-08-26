import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { expenseItemAssignments, expenseItems, expensePayers, expenseSplits, expenses } from "@/db/schema";
import {
  getActiveTripContext,
} from "@/lib/active-trip";
import {
  canAccessCountry,
  getCountryWithTrip,
  listCountryMembers,
} from "@/lib/access";
import { recordActivity } from "@/lib/activity";
import { expenseLedgerLockedResponse } from "@/lib/financial-close";
import { buildExpenseSplits, convertedAmount, effectiveExchangeRate, sameCurrency } from "@/lib/money";
import { buildReceiptItemization, type ReceiptItemizationResult } from "@/lib/receipt-itemization";
import { buildExpensePayers } from "@/lib/expense-payers";
import { sendPushToCountry } from "@/lib/push";
import { isTrustedMutationRequest, mutationRejectedResponse } from "@/lib/request-security";
import { getSession } from "@/lib/session";
import { expenseSchema } from "@/lib/validation";
import { getTripCapabilities } from "@/lib/trip-capabilities";

export const runtime = "nodejs";

async function replaceExpenseItemization(
  expenseId: string,
  itemization: ReceiptItemizationResult | null,
): Promise<void> {
  await db.delete(expenseItems).where(eq(expenseItems.expenseId, expenseId));
  if (!itemization) return;

  for (const item of itemization.items) {
    const created = await db
      .insert(expenseItems)
      .values({
        expenseId,
        title: item.title,
        transactionAmount: item.transactionAmount.toFixed(2),
        baseAmount: item.baseAmount.toFixed(2),
      })
      .returning({ id: expenseItems.id });
    const itemId = created[0]?.id;
    if (!itemId) throw new Error("Unable to save receipt itemization.");
    if (item.assignments.length) {
      await db.insert(expenseItemAssignments).values(
        item.assignments.map((assignment) => ({
          itemId,
          userId: assignment.userId,
          shareAmountBase: assignment.shareAmountBase,
        })),
      );
    }
  }
}

async function replaceExpensePayers(
  expenseId: string,
  payers: Array<{ userId: string; amountBase: string }>,
): Promise<void> {
  await db.delete(expensePayers).where(eq(expensePayers.expenseId, expenseId));
  await db.insert(expensePayers).values(
    payers.map((payer) => ({ expenseId, ...payer })),
  );
}


export async function GET() {
  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activeTrip =
    await getActiveTripContext(
      session.user,
    );
  const ids =
    activeTrip.countries.map(
      (country) =>
        country.id,
    );

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

    const priorRequest = input.clientRequestId
      ? (
          await db
            .select({
              id: expenses.id,
              countryId: expenses.countryId,
              createdBy: expenses.createdBy,
            })
            .from(expenses)
            .where(eq(expenses.id, input.clientRequestId))
            .limit(1)
        )[0] ?? null
      : null;

    if (
      priorRequest &&
      (priorRequest.createdBy !== session.user.id ||
        priorRequest.countryId !== input.countryId)
    ) {
      return Response.json(
        {
          error: "This save request conflicts with an existing expense.",
          code: "REQUEST_ID_CONFLICT",
        },
        { status: 409 },
      );
    }

    let repairPriorRequest = false;
    let existingSplitCount = 0;
    let existingItemCount = 0;
    let existingAssignmentCount = 0;
    let existingPayerCount = 0;

    if (priorRequest) {
      const [existingSplits, existingItems, existingPayers] = await Promise.all([
        db
          .select({ expenseId: expenseSplits.expenseId })
          .from(expenseSplits)
          .where(eq(expenseSplits.expenseId, priorRequest.id)),
        db
          .select({ id: expenseItems.id })
          .from(expenseItems)
          .where(eq(expenseItems.expenseId, priorRequest.id)),
        db
          .select({ expenseId: expensePayers.expenseId })
          .from(expensePayers)
          .where(eq(expensePayers.expenseId, priorRequest.id)),
      ]);

      existingSplitCount = existingSplits.length;
      existingItemCount = existingItems.length;
      existingPayerCount = existingPayers.length;

      if (existingItems.length) {
        const assignments = await db
          .select({ itemId: expenseItemAssignments.itemId })
          .from(expenseItemAssignments)
          .where(inArray(expenseItemAssignments.itemId, existingItems.map((item) => item.id)));
        existingAssignmentCount = assignments.length;
      }
    }

    // A previously accepted idempotent request may finish its split repair even
    // if the owner locked the trip in the meantime. Brand-new financial writes
    // are blocked once the final-settlement snapshot is closed.
    if (!priorRequest) {
      if (!(await getTripCapabilities(session.user, country.tripId)).canAddExpenses) {
        return Response.json({ error: "You have view-only access to this Trip's finances." }, { status: 403 });
      }
      const locked = await expenseLedgerLockedResponse(country.tripId);

      if (locked) {
        return locked;
      }
    }

    if (!input.allowDuplicate && !priorRequest) {
      const sameDay = await db
        .select({
          id: expenses.id,
          description: expenses.description,
          transactionCurrency: expenses.transactionCurrency,
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
          Math.abs(Number(row.transactionAmount) - input.transactionAmount) < 0.01;
        const sameCurrency =
          row.transactionCurrency.toUpperCase() === input.transactionCurrency.toUpperCase();
        const sameMerchant =
          existingDescription === normalizedDescription ||
          (existingDescription.length >= 5 &&
            normalizedDescription.length >= 5 &&
            (existingDescription.includes(normalizedDescription) ||
              normalizedDescription.includes(existingDescription)));

        return sameAmount && sameCurrency && sameMerchant;
      });

      if (duplicate) {
        return Response.json(
          {
            error: "Possible duplicate expense.",
            code: "POSSIBLE_DUPLICATE",
            duplicate: {
              id: duplicate.id,
              description: duplicate.description,
              currency: duplicate.transactionCurrency,
              amount: Number(duplicate.transactionAmount),
            },
          },
          { status: 409 },
        );
      }
    }

    const members = await listCountryMembers(input.countryId, session.user.id);
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

    if (input.itemization.some((item) => item.assigneeUserIds.some((userId) => !memberIds.has(userId)))) {
      return Response.json(
        { error: "Every receipt item traveler must be assigned to this trip." },
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

    const settlementBase =
      actualConvertedAmount ?? baseAmount;
    const itemization = input.itemization.length
      ? buildReceiptItemization(input.transactionAmount, settlementBase, input.itemization)
      : null;
    const calculatedSplits = itemization?.splits ??
      buildExpenseSplits(settlementBase, input.splitMode, input.splits);
    const calculatedPayers = buildExpensePayers(
      settlementBase,
      input.paidByUserId,
      input.payers,
    );

    if (priorRequest) {
      const expectedItemCount = itemization?.items.length ?? 0;
      const expectedAssignmentCount = itemization?.items.reduce(
        (sum, item) => sum + item.assignments.length,
        0,
      ) ?? 0;
      const derivedRowsComplete =
        existingSplitCount === calculatedSplits.length &&
        existingItemCount === expectedItemCount &&
        existingAssignmentCount === expectedAssignmentCount &&
        existingPayerCount === calculatedPayers.length;

      if (derivedRowsComplete) {
        return Response.json({ id: priorRequest.id, idempotent: true });
      }

      // A previous idempotent request may have stopped after any derived row
      // set. Rebuild splits + item rows from the same validated request.
      repairPriorRequest = true;
    }

    if (repairPriorRequest && priorRequest) {
      await db.delete(expenseSplits).where(eq(expenseSplits.expenseId, priorRequest.id));
      await db.insert(expenseSplits).values(
        calculatedSplits.map((split) => ({ expenseId: priorRequest.id, ...split })),
      );
      await replaceExpenseItemization(priorRequest.id, itemization);
      await replaceExpensePayers(priorRequest.id, calculatedPayers);

      await recordActivity({
        actorUserId: session.user.id,
        action: "RECOVERED",
        entityType: "EXPENSE",
        entityId: priorRequest.id,
        tripId: country.tripId,
        countryId: input.countryId,
        summary: `${session.user.name} recovered an interrupted expense save: ${input.description}`,
      });

      return Response.json({
        id: priorRequest.id,
        idempotent: true,
        recovered: true,
      });
    }

    const inserted = await db
      .insert(expenses)
      .values({
        ...(input.clientRequestId ? { id: input.clientRequestId } : {}),
        tripId: country.tripId,
        countryId: input.countryId,
        expenseDate: input.expenseDate,
        category: input.category,
        description: input.description,
        transactionCurrency: input.transactionCurrency,
        transactionAmount: input.transactionAmount.toFixed(2),
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
          input.receiptUrl && input.receiptReviewStatus === "REVIEWED"
            ? new Date()
            : null,
        notes: input.notes || null,
        createdBy: session.user.id,
      })
      .returning({ id: expenses.id });

    await db.insert(expenseSplits).values(
      calculatedSplits.map((split) => ({ expenseId: inserted[0].id, ...split })),
    );
    await replaceExpensePayers(inserted[0].id, calculatedPayers);
    await replaceExpenseItemization(inserted[0].id, itemization);

    await recordActivity({
      actorUserId: session.user.id,
      action: "CREATED",
      entityType: "EXPENSE",
      entityId: inserted[0].id,
      tripId: country.tripId,
      countryId: input.countryId,
      summary: `${session.user.name} added expense: ${input.description}`,
      metadata: {
        category: input.category,
        amount: input.transactionAmount,
        currency: input.transactionCurrency,
      },
    });

    await sendPushToCountry(
      input.countryId,
      session.user.id,
      "EXPENSES",
      {
        title: "New trip expense",
        body: `${session.user.name} added ${input.transactionCurrency} ${input.transactionAmount.toFixed(2)} · ${input.description}`,
        url: "/expenses",
        tag: `expense-${inserted[0].id}`,
      },
    );

    return Response.json({ id: inserted[0].id }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid expense request.";
    return Response.json({ error: message }, { status: 400 });
  }
}
