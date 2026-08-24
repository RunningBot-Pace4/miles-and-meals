import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { expenseItemAssignments, expenseItems, expenseSplits, expenses } from "@/db/schema";
import {
  isCountryInActiveTrip,
} from "@/lib/active-trip";
import {
  getCountryWithTrip,
  listCountryMembers,
} from "@/lib/access";
import { recordActivity } from "@/lib/activity";
import { expenseLedgerLockedResponse } from "@/lib/financial-close";
import { buildExpenseSplits, convertedAmount, effectiveExchangeRate, sameCurrency } from "@/lib/money";
import { buildReceiptItemization, type ReceiptItemizationResult } from "@/lib/receipt-itemization";
import { sendPushToCountry } from "@/lib/push";
import { isTrustedMutationRequest, mutationRejectedResponse } from "@/lib/request-security";
import { getSession } from "@/lib/session";
import { expenseUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";

async function replaceExpenseItemization(
  expenseId: string,
  itemization: ReceiptItemizationResult | null,
): Promise<void> {
  await db.delete(expenseItems).where(eq(expenseItems.expenseId, expenseId));
  if (!itemization) return;
  for (const item of itemization.items) {
    const created = await db.insert(expenseItems).values({
      expenseId,
      title: item.title,
      transactionAmount: item.transactionAmount.toFixed(2),
      baseAmount: item.baseAmount.toFixed(2),
    }).returning({ id: expenseItems.id });
    const itemId = created[0]?.id;
    if (!itemId) throw new Error("Unable to save receipt itemization.");
    if (item.assignments.length) {
      await db.insert(expenseItemAssignments).values(item.assignments.map((assignment) => ({
        itemId, userId: assignment.userId, shareAmountBase: assignment.shareAmountBase,
      })));
    }
  }
}


type Context = {
  params: Promise<{ id: string }>;
};

async function getExisting(id: string) {
  const rows = await db
    .select()
    .from(expenses)
    .where(eq(expenses.id, id))
    .limit(1);

  return rows[0] ?? null;
}

export async function PUT(request: Request, context: Context) {
  if (!isTrustedMutationRequest(request)) {
    return mutationRejectedResponse();
  }

  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await getExisting(id);

  if (!existing) {
    return Response.json({ error: "Expense not found." }, { status: 404 });
  }

  if (!(await isCountryInActiveTrip(session.user, existing.countryId))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const locked = await expenseLedgerLockedResponse(existing.tripId);

  if (locked) {
    return locked;
  }

  try {
    const input = expenseUpdateSchema.parse(await request.json());

    if (!(await isCountryInActiveTrip(session.user, input.countryId))) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    if (input.expectedUpdatedAt) {
      const expected = new Date(input.expectedUpdatedAt).getTime();
      const current = existing.updatedAt.getTime();

      if (!Number.isFinite(expected) || Math.abs(expected - current) > 1) {
        return Response.json(
          {
            error:
              "This expense was changed by another traveler after you opened it. Reload the latest version before saving.",
            code: "STALE_EDIT",
            currentUpdatedAt: existing.updatedAt.toISOString(),
          },
          { status: 409 },
        );
      }
    }

    const country = await getCountryWithTrip(input.countryId);

    if (!country) {
      return Response.json({ error: "Country not found." }, { status: 404 });
    }

    const members = await listCountryMembers(input.countryId, session.user.id);
    const memberIds = new Set(members.map((member) => member.id));

    if (
      !memberIds.has(input.paidByUserId) ||
      input.splits.some((split) => !memberIds.has(split.userId)) ||
      input.itemization.some((item) => item.assigneeUserIds.some((userId) => !memberIds.has(userId)))
    ) {
      return Response.json(
        { error: "Payer, split members and receipt-item travelers must belong to the trip." },
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
    const itemization = input.itemization.length
      ? buildReceiptItemization(input.transactionAmount, settlementBase, input.itemization)
      : null;
    const calculatedSplits = itemization?.splits ??
      buildExpenseSplits(settlementBase, input.splitMode, input.splits);

    await db
      .update(expenses)
      .set({
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
        actualConvertedAmount: actual === null ? null : actual.toFixed(2),
        splitMode: itemization ? "EXACT" : input.splitMode,
        paidByUserId: input.paidByUserId,
        paymentMethod: input.paymentMethod || null,
        receiptUrl: input.receiptUrl || null,
        notes: input.notes || null,
        updatedAt: new Date(),
      })
      .where(eq(expenses.id, id));

    await db.delete(expenseSplits).where(eq(expenseSplits.expenseId, id));

    await db.insert(expenseSplits).values(
      calculatedSplits.map((split) => ({ expenseId: id, ...split })),
    );
    await replaceExpenseItemization(id, itemization);

    await recordActivity({
      actorUserId: session.user.id,
      action: "UPDATED",
      entityType: "EXPENSE",
      entityId: id,
      tripId: country.tripId,
      countryId: input.countryId,
      summary: `${session.user.name} updated expense: ${input.description}`,
    });

    await sendPushToCountry(
      input.countryId,
      session.user.id,
      "EXPENSES",
      {
        title: "Expense updated",
        body: `${session.user.name} updated ${input.description}.`,
        url: "/expenses",
        tag: `expense-${id}`,
      },
    );

    return Response.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid expense request.";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: Context) {
  if (!isTrustedMutationRequest(request)) {
    return mutationRejectedResponse();
  }

  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await getExisting(id);

  if (!existing) {
    return Response.json({ error: "Expense not found." }, { status: 404 });
  }

  if (!(await isCountryInActiveTrip(session.user, existing.countryId))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const locked = await expenseLedgerLockedResponse(existing.tripId);

  if (locked) {
    return locked;
  }

  await db.delete(expenses).where(eq(expenses.id, id));

  await recordActivity({
    actorUserId: session.user.id,
    action: "DELETED",
    entityType: "EXPENSE",
    entityId: id,
    tripId: existing.tripId,
    countryId: existing.countryId,
    summary: `${session.user.name} deleted expense: ${existing.description}`,
  });

  await sendPushToCountry(
    existing.countryId,
    session.user.id,
    "EXPENSES",
    {
      title: "Expense removed",
      body: `${session.user.name} removed ${existing.description}.`,
      url: "/expenses",
      tag: `expense-${id}`,
    },
  );

  return Response.json({ ok: true });
}
