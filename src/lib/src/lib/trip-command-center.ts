import { and, asc, eq, gte, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { expenseSplits, expenses, travelItems } from "@/db/schema";
import { toNumber } from "@/lib/money";

export type TripStage = "BEFORE" | "DURING" | "AFTER" | "CLOSED";

function malaysiaToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function daysBetween(start: string, end: string): number {
  const from = new Date(`${start}T00:00:00Z`).getTime();
  const to = new Date(`${end}T00:00:00Z`).getTime();
  return Math.max(0, Math.round((to - from) / 86_400_000));
}

export async function loadTripCommandCenter(input: {
  tripId: string;
  countryIds: string[];
  userId: string;
  startDate: string | null;
  endDate: string | null;
  financialStatus: string;
  myBudget: number;
  myShareSpent: number;
}) {
  const today = malaysiaToday();
  if (!input.tripId || !input.countryIds.length) {
    return null;
  }

  const [planRows, todaySpendRows, todayShareRows, openTaskRows] = await Promise.all([
    db
      .select({
        id: travelItems.id,
        title: travelItems.title,
        itemDate: travelItems.itemDate,
        itemTime: travelItems.itemTime,
        area: travelItems.area,
        itemType: travelItems.itemType,
        status: travelItems.status,
      })
      .from(travelItems)
      .where(and(
        inArray(travelItems.countryId, input.countryIds),
        gte(travelItems.itemDate, today),
        or(isNull(travelItems.status), ne(travelItems.status, "Done")),
      ))
      .orderBy(asc(travelItems.itemDate), asc(travelItems.sortOrder), asc(travelItems.itemTime))
      .limit(30),
    db
      .select({ total: sql<string>`sum(coalesce(nullif(${expenses.actualConvertedAmount}, 0), ${expenses.convertedAmount}))` })
      .from(expenses)
      .where(and(inArray(expenses.countryId, input.countryIds), eq(expenses.expenseDate, today))),
    db
      .select({ total: sql<string>`sum(${expenseSplits.shareAmountBase})` })
      .from(expenseSplits)
      .innerJoin(expenses, eq(expenseSplits.expenseId, expenses.id))
      .where(and(
        inArray(expenses.countryId, input.countryIds),
        eq(expenses.expenseDate, today),
        eq(expenseSplits.userId, input.userId),
      )),
    db
      .select({ count: sql<number>`count(*)` })
      .from(travelItems)
      .where(and(
        inArray(travelItems.countryId, input.countryIds),
        inArray(travelItems.itemType, ["CHECKLIST", "PACKING"]),
        or(isNull(travelItems.status), ne(travelItems.status, "Done")),
      )),
  ]);

  const stage: TripStage = input.financialStatus === "CLOSED"
    ? "CLOSED"
    : input.startDate && today < input.startDate
      ? "BEFORE"
      : input.endDate && today > input.endDate
        ? "AFTER"
        : "DURING";
  const totalDays = input.startDate && input.endDate
    ? daysBetween(input.startDate, input.endDate) + 1
    : 0;
  const elapsedDays = input.startDate
    ? Math.min(totalDays || Number.MAX_SAFE_INTEGER, Math.max(1, daysBetween(input.startDate, today) + 1))
    : 1;
  const remainingDays = input.endDate && today <= input.endDate
    ? daysBetween(today, input.endDate) + 1
    : 0;
  const remainingBudget = input.myBudget - input.myShareSpent;
  const projectedSpend = totalDays > 0 && elapsedDays > 0
    ? (input.myShareSpent / elapsedDays) * totalDays
    : input.myShareSpent;
  const todayItems = planRows.filter((item) => item.itemDate === today);

  return {
    today,
    stage,
    nextItem: planRows[0] ?? null,
    todayItemCount: todayItems.length,
    todayGroupSpend: toNumber(todaySpendRows[0]?.total),
    todayMyShare: toNumber(todayShareRows[0]?.total),
    remainingDays,
    dailyAllowance: remainingDays > 0 ? Math.max(0, remainingBudget / remainingDays) : 0,
    projectedSpend,
    forecastOver: input.myBudget > 0 && projectedSpend > input.myBudget,
    openTaskCount: Number(openTaskRows[0]?.count ?? 0),
  };
}
