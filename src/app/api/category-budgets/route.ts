import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { expenses, tripCategoryBudgets, trips } from "@/db/schema";
import { canAccessTrip } from "@/lib/access";
import { closedTripReadOnlyResponse } from "@/lib/financial-close";
import { toNumber } from "@/lib/money";
import { isTrustedMutationRequest, mutationRejectedResponse } from "@/lib/request-security";
import { getSession } from "@/lib/session";
import { canManageTrip } from "@/lib/trip-management";
import { categoryBudgetSchema, uuidSchema } from "@/lib/validation";

export const runtime = "nodejs";

const categoryOrder = ["Food", "Transport", "Hotel", "Shopping", "Attractions", "Flights", "Other"];

function normalizeCategory(category: string) {
  const aliases: Record<string, string> = {
    Meals: "Food",
    Travel: "Transport",
    Accommodation: "Hotel",
    Stay: "Hotel",
    Shop: "Shopping",
    Activities: "Attractions",
    Things: "Attractions",
    Flight: "Flights",
  };
  return aliases[category] ?? (categoryOrder.includes(category) ? category : "Other");
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const tripId = new URL(request.url).searchParams.get("tripId") ?? "";
  if (!uuidSchema.safeParse(tripId).success || !(await canAccessTrip(session.user, tripId))) {
    return Response.json({ error: "Trip not found." }, { status: 404 });
  }

  const [budgetRows, spendingRows, tripRows, canManage] = await Promise.all([
    db.select().from(tripCategoryBudgets).where(eq(tripCategoryBudgets.tripId, tripId)),
    db
      .select({
        category: expenses.category,
        spent: sql<string>`sum(coalesce(nullif(${expenses.actualConvertedAmount}, 0), ${expenses.convertedAmount}))`,
      })
      .from(expenses)
      .where(eq(expenses.tripId, tripId))
      .groupBy(expenses.category),
    db.select({ baseCurrency: trips.baseCurrency }).from(trips).where(eq(trips.id, tripId)).limit(1),
    canManageTrip(session.user, tripId),
  ]);

  const spent = new Map<string, number>();
  for (const row of spendingRows) {
    const category = normalizeCategory(row.category);
    spent.set(category, (spent.get(category) ?? 0) + toNumber(row.spent));
  }
  const limits = new Map<string, number>();
  for (const row of budgetRows) {
    const category = normalizeCategory(row.category);
    limits.set(category, Math.max(limits.get(category) ?? 0, toNumber(row.amount)));
  }
  return Response.json({
    baseCurrency: tripRows[0]?.baseCurrency ?? "MYR",
    canManage,
    categories: categoryOrder.map((category) => ({
      category,
      amount: limits.get(category) ?? 0,
      spent: spent.get(category) ?? 0,
    })),
  });
}

export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) return mutationRejectedResponse();
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const input = categoryBudgetSchema.parse(await request.json());
    if (!(await canManageTrip(session.user, input.tripId))) {
      return Response.json({ error: "Only a Trip Owner can set group category limits." }, { status: 403 });
    }
    const locked = await closedTripReadOnlyResponse(input.tripId);
    if (locked) return locked;

    if (input.amount === 0) {
      await db.delete(tripCategoryBudgets).where(and(
        eq(tripCategoryBudgets.tripId, input.tripId),
        eq(tripCategoryBudgets.category, input.category),
      ));
    } else {
      await db
        .insert(tripCategoryBudgets)
        .values({
          tripId: input.tripId,
          category: input.category,
          amount: input.amount.toFixed(2),
          createdBy: session.user.id,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [tripCategoryBudgets.tripId, tripCategoryBudgets.category],
          set: { amount: input.amount.toFixed(2), updatedAt: new Date() },
        });
    }
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to save category limit." },
      { status: 400 },
    );
  }
}
