import {
  and,
  asc,
  eq,
  inArray,
  ne,
} from "drizzle-orm";
import { db } from "@/db";
import {
  countries,
  expenses,
  settlements,
  travelItems,
  tripBudgets,
  user,
} from "@/db/schema";
import {
  getActiveTripContext,
} from "@/lib/active-trip";
import { getSession } from "@/lib/session";

function csvCell(value: unknown): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  const text = String(value);

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n") ||
    text.includes("\r")
  ) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

function csvLine(values: unknown[]): string {
  return values.map(csvCell).join(",");
}

export async function GET(request: Request) {
  const session = await getSession();

  if (!session) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const format =
    url.searchParams.get("format") === "csv"
      ? "csv"
      : "json";

  const activeTrip =
    await getActiveTripContext(
      session.user,
    );
  const allowed =
    activeTrip.countries;
  const countryIds = allowed.map(
    (country) => country.id,
  );

  const countryById = new Map<
    string,
    (typeof allowed)[number]
  >(
    allowed.map((country) => [
      country.id,
      country,
    ]),
  );
  const tripIds = [
    ...new Set(
      allowed.map(
        (country) =>
          country.tripId,
      ),
    ),
  ];


  if (countryIds.length === 0) {
    const empty = {
      exportedAt: new Date().toISOString(),
      countries: [],
      expenses: [],
      planner: [],
      settlements: [],
      personalBudgets: [],
    };

    if (format === "json") {
      return Response.json(empty, {
        headers: {
          "content-disposition":
            'attachment; filename="miles-and-meals-export.json"',
        },
      });
    }

    return new Response(
      csvLine([
        "record_type",
        "trip",
        "country",
        "date",
        "title",
        "category",
        "amount",
        "currency",
        "status",
        "person",
      ]) + "\n",
      {
        headers: {
          "content-type":
            "text/csv; charset=utf-8",
          "content-disposition":
            'attachment; filename="miles-and-meals-export.csv"',
        },
      },
    );
  }

  const [
    expenseRows,
    plannerRows,
    settlementRows,
    personalBudgetRows,
  ] = await Promise.all([
    db
      .select({
        id: expenses.id,
        countryId: expenses.countryId,
        expenseDate: expenses.expenseDate,
        description: expenses.description,
        category: expenses.category,
        transactionCurrency:
          expenses.transactionCurrency,
        transactionAmount:
          expenses.transactionAmount,
        baseCurrency: expenses.baseCurrency,
        convertedAmount:
          expenses.convertedAmount,
        actualConvertedAmount:
          expenses.actualConvertedAmount,
        paidByUserId:
          expenses.paidByUserId,
        paidByName: user.name,
        notes: expenses.notes,
        createdAt: expenses.createdAt,
        updatedAt: expenses.updatedAt,
      })
      .from(expenses)
      .leftJoin(
        user,
        eq(
          expenses.paidByUserId,
          user.id,
        ),
      )
      .where(
        inArray(
          expenses.countryId,
          countryIds,
        ),
      )
      .orderBy(
        asc(expenses.expenseDate),
      ),
    db
      .select()
      .from(travelItems)
      .where(
        and(
          inArray(travelItems.countryId, countryIds),
          ne(travelItems.itemType, "BOOKING"),
        ),
      )
      .orderBy(
        asc(travelItems.itemDate),
      ),
    db
      .select()
      .from(settlements)
      .where(
        inArray(
          settlements.countryId,
          countryIds,
        ),
      )
      .orderBy(
        asc(settlements.createdAt),
      ),
    db
      .select()
      .from(tripBudgets)
      .where(
        and(
          inArray(
            tripBudgets.tripId,
            tripIds,
          ),
          eq(
            tripBudgets.userId,
            session.user.id,
          ),
        ),
      ),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    exportedBy: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    },
    countries: allowed,
    expenses: expenseRows,
    planner: plannerRows,
    settlements: settlementRows,
    personalBudgets:
      personalBudgetRows.filter(
        (row) =>
          row.userId ===
          session.user.id,
      ),
  };

  if (format === "json") {
    return new Response(
      JSON.stringify(
        exportData,
        null,
        2,
      ),
      {
        headers: {
          "content-type":
            "application/json; charset=utf-8",
          "content-disposition":
            'attachment; filename="miles-and-meals-export.json"',
          "cache-control": "no-store",
        },
      },
    );
  }

  const lines = [
    csvLine([
      "record_type",
      "trip",
      "country",
      "date",
      "title",
      "category",
      "amount",
      "currency",
      "status",
      "person",
    ]),
  ];

  for (const expense of expenseRows) {
    const country =
      countryById.get(expense.countryId);

    lines.push(
      csvLine([
        "expense",
        country?.tripName ?? "",
        country?.name ?? "",
        expense.expenseDate,
        expense.description,
        expense.category,
        expense.transactionAmount,
        expense.transactionCurrency,
        "",
        expense.paidByName ?? "",
      ]),
    );
  }

  for (const item of plannerRows) {
    const country =
      countryById.get(item.countryId);

    lines.push(
      csvLine([
        "planner",
        country?.tripName ?? "",
        country?.name ?? "",
        item.itemDate ?? "",
        item.title,
        item.itemType,
        item.estimatedCost ?? "",
        country?.currencyCode ?? "",
        item.status ?? "",
        "",
      ]),
    );
  }

  for (const settlement of settlementRows) {
    const country =
      countryById.get(
        settlement.countryId,
      );

    lines.push(
      csvLine([
        "settlement",
        country?.tripName ?? "",
        country?.name ?? "",
        settlement.createdAt.toISOString(),
        "Settlement",
        "payment",
        settlement.amount,
        settlement.currency,
        settlement.status,
        `${settlement.fromUserId} -> ${settlement.toUserId}`,
      ]),
    );
  }

  for (
    const budget of
      personalBudgetRows
  ) {
    if (
      budget.userId !==
      session.user.id
    ) {
      continue;
    }

    const trip =
      allowed.find(
        (country) =>
          country.tripId ===
          budget.tripId,
      );

    lines.push(
      csvLine([
        "personal_budget",
        trip?.tripName ?? "",
        "",
        "",
        "My trip budget",
        "budget",
        budget.amount,
        trip?.baseCurrency ?? "",
        "",
        session.user.name,
      ]),
    );
  }

  return new Response(
    `${lines.join("\n")}\n`,
    {
      headers: {
        "content-type":
          "text/csv; charset=utf-8",
        "content-disposition":
          'attachment; filename="miles-and-meals-export.csv"',
        "cache-control": "no-store",
      },
    },
  );
}
