import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { expenseSplits, expenses } from "@/db/schema";
import {
  canAccessCountry,
  getCountryWithTrip,
  listAccessibleCountries,
  listCountryMembers,
} from "@/lib/access";
import { recordActivity } from "@/lib/activity";
import { buildExpenseSplits, convertedAmount, effectiveExchangeRate, sameCurrency } from "@/lib/money";
import { sendPushToCountry } from "@/lib/push";
import { isTrustedMutationRequest, mutationRejectedResponse } from "@/lib/request-security";
import { getSession } from "@/lib/session";
import { expenseSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await listAccessibleCountries(session.user);
  const ids = allowed.map((country) => country.id);

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
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const country = await getCountryWithTrip(input.countryId);

    if (!country) {
      return Response.json({ error: "Country not found." }, { status: 404 });
    }

    const members = await listCountryMembers(input.countryId, session.user.id);
    const memberIds = new Set(members.map((member) => member.id));

    if (!memberIds.has(input.paidByUserId)) {
      return Response.json(
        { error: "The payer is not assigned to this country." },
        { status: 400 },
      );
    }

    if (input.splits.some((split) => !memberIds.has(split.userId))) {
      return Response.json(
        { error: "Every split member must be assigned to this country." },
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

    const inserted = await db
      .insert(expenses)
      .values({
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
        splitMode: input.splitMode,
        paidByUserId: input.paidByUserId,
        paymentMethod: input.paymentMethod || null,
        receiptUrl: input.receiptUrl || null,
        notes: input.notes || null,
        createdBy: session.user.id,
      })
      .returning({ id: expenses.id });

    const settlementBase =
      actualConvertedAmount ?? baseAmount;

    await db.insert(expenseSplits).values(
      buildExpenseSplits(settlementBase, input.splitMode, input.splits).map(
        (split) => ({
          expenseId: inserted[0].id,
          ...split,
        }),
      ),
    );

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
