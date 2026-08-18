import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { expenseSplits, expenses } from "@/db/schema";
import {
  canAccessCountry,
  getCountryWithTrip,
  listCountryMembers,
} from "@/lib/access";
import { buildExpenseSplits, convertedAmount } from "@/lib/money";
import { getSession } from "@/lib/session";
import { expenseSchema } from "@/lib/validation";

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
  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await getExisting(id);

  if (!existing) {
    return Response.json({ error: "Expense not found." }, { status: 404 });
  }

  if (!(await canAccessCountry(session.user, existing.countryId))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
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

    if (
      !memberIds.has(input.paidByUserId) ||
      input.splits.some((split) => !memberIds.has(split.userId))
    ) {
      return Response.json(
        { error: "Payer and split members must belong to the country." },
        { status: 400 },
      );
    }

    const baseAmount = convertedAmount(
      input.transactionAmount,
      input.exchangeRate,
    );

    const actual =
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
        exchangeRate: input.exchangeRate.toFixed(10),
        rateType: input.rateType,
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

    return Response.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid expense request.";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: Context) {
  const session = await getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await getExisting(id);

  if (!existing) {
    return Response.json({ error: "Expense not found." }, { status: 404 });
  }

  if (!(await canAccessCountry(session.user, existing.countryId))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.delete(expenses).where(eq(expenses.id, id));
  return Response.json({ ok: true });
}
