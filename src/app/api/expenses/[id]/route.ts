import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { expenseSplits, expenses } from "@/db/schema";
import {
  isCountryInActiveTrip,
} from "@/lib/active-trip";
import {
  getCountryWithTrip,
  listCountryMembers,
} from "@/lib/access";
import { recordActivity } from "@/lib/activity";
import { buildExpenseSplits, convertedAmount, effectiveExchangeRate, sameCurrency } from "@/lib/money";
import { sendPushToCountry } from "@/lib/push";
import { isTrustedMutationRequest, mutationRejectedResponse } from "@/lib/request-security";
import { getSession } from "@/lib/session";
import { expenseSchema } from "@/lib/validation";

export const runtime = "nodejs";

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

  try {
    const input = expenseSchema.parse(await request.json());

    if (!(await isCountryInActiveTrip(session.user, input.countryId))) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const country = await getCountryWithTrip(input.countryId);

    if (!country) {
      return Response.json({ error: "Country not found." }, { status: 404 });
    }

    const members = await listCountryMembers(input.countryId, session.user.id);
    const memberIds = new Set(members.map((member) => member.id));

    if (
      !memberIds.has(input.paidByUserId) ||
      input.splits.some((split) => !memberIds.has(split.userId))
    ) {
      return Response.json(
        { error: "Payer and split members must belong to the country." },
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
        splitMode: input.splitMode,
        paidByUserId: input.paidByUserId,
        paymentMethod: input.paymentMethod || null,
        receiptUrl: input.receiptUrl || null,
        notes: input.notes || null,
        updatedAt: new Date(),
      })
      .where(eq(expenses.id, id));

    await db.delete(expenseSplits).where(eq(expenseSplits.expenseId, id));

    await db.insert(expenseSplits).values(
      buildExpenseSplits(actual ?? baseAmount, input.splitMode, input.splits).map(
        (split) => ({
          expenseId: id,
          ...split,
        }),
      ),
    );

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
