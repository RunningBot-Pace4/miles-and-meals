import {
  desc,
} from "drizzle-orm";
import { db } from "@/db";
import {
  apiMetrics,
  countries,
  countryMembers,
  expenseSplits,
  expenses,
  settlements,
  tripMembers,
} from "@/db/schema";
import {
  effectiveConvertedAmount,
  toNumber,
} from "@/lib/money";

export type ConsistencyIssue = {
  type: string;
  count: number;
  detail: string;
};

export type ConsistencyReport = {
  ok: boolean;
  checkedAt: string;
  issues: ConsistencyIssue[];
};

export async function runConsistencyChecks(): Promise<ConsistencyReport> {
  try {
    const [
      countryRows,
      expenseRows,
      splitRows,
      settlementRows,
      countryMemberRows,
      tripMemberRows,
    ] = await Promise.all([
      db
        .select({
          id: countries.id,
          tripId: countries.tripId,
        })
        .from(countries),
      db
        .select({
          id: expenses.id,
          tripId: expenses.tripId,
          countryId: expenses.countryId,
          convertedAmount:
            expenses.convertedAmount,
          actualConvertedAmount:
            expenses.actualConvertedAmount,
        })
        .from(expenses),
      db
        .select({
          expenseId:
            expenseSplits.expenseId,
          share:
            expenseSplits.shareAmountBase,
        })
        .from(expenseSplits),
      db
        .select({
          id: settlements.id,
          tripId: settlements.tripId,
          countryId:
            settlements.countryId,
          fromUserId:
            settlements.fromUserId,
          toUserId:
            settlements.toUserId,
          amount:
            settlements.amount,
          status:
            settlements.status,
          confirmedBy:
            settlements.confirmedBy,
          confirmedAt:
            settlements.confirmedAt,
        })
        .from(settlements),
      db
        .select({
          countryId:
            countryMembers.countryId,
          userId:
            countryMembers.userId,
        })
        .from(countryMembers),
      db
        .select({
          tripId:
            tripMembers.tripId,
          userId:
            tripMembers.userId,
        })
        .from(tripMembers),
    ]);

    const issues: ConsistencyIssue[] =
      [];
    const countryTrip = new Map(
      countryRows.map(
        (country) => [
          country.id,
          country.tripId,
        ],
      ),
    );

    const expenseTripMismatch =
      expenseRows.filter(
        (expense) =>
          countryTrip.get(
            expense.countryId,
          ) !== expense.tripId,
      ).length;

    if (expenseTripMismatch > 0) {
      issues.push({
        type: "EXPENSE_TRIP_MISMATCH",
        count:
          expenseTripMismatch,
        detail:
          "Expense trip_id does not match the selected country’s trip.",
      });
    }

    const settlementTripMismatch =
      settlementRows.filter(
        (settlement) =>
          countryTrip.get(
            settlement.countryId,
          ) !==
          settlement.tripId,
      ).length;

    if (
      settlementTripMismatch > 0
    ) {
      issues.push({
        type:
          "SETTLEMENT_TRIP_MISMATCH",
        count:
          settlementTripMismatch,
        detail:
          "Settlement trip_id does not match its country.",
      });
    }

    const splitsByExpense =
      new Map<string, number>();

    for (const split of splitRows) {
      splitsByExpense.set(
        split.expenseId,
        (
          splitsByExpense.get(
            split.expenseId,
          ) ?? 0
        ) +
          toNumber(split.share),
      );
    }

    const noSplitCount =
      expenseRows.filter(
        (expense) =>
          !splitsByExpense.has(
            expense.id,
          ),
      ).length;

    if (noSplitCount > 0) {
      issues.push({
        type: "EXPENSE_NO_SPLITS",
        count: noSplitCount,
        detail:
          "Expenses exist without any personal share rows.",
      });
    }

    const splitMismatchCount =
      expenseRows.filter(
        (expense) => {
          const expected =
            effectiveConvertedAmount(
              expense.convertedAmount,
              expense.actualConvertedAmount,
            );
          const actual =
            splitsByExpense.get(
              expense.id,
            ) ?? 0;

          return (
            Math.abs(
              expected - actual,
            ) > 0.011
          );
        },
      ).length;

    if (
      splitMismatchCount > 0
    ) {
      issues.push({
        type:
          "EXPENSE_SPLIT_MISMATCH",
        count:
          splitMismatchCount,
        detail:
          "Personal shares do not add up to the expense settlement amount.",
      });
    }

    const tripMemberKeys =
      new Set(
        tripMemberRows.map(
          (membership) =>
            `${membership.tripId}:${membership.userId}`,
        ),
      );

    const assignmentMismatch =
      countryMemberRows.filter(
        (membership) => {
          const tripId =
            countryTrip.get(
              membership.countryId,
            );

          return (
            !tripId ||
            !tripMemberKeys.has(
              `${tripId}:${membership.userId}`,
            )
          );
        },
      ).length;

    if (
      assignmentMismatch > 0
    ) {
      issues.push({
        type:
          "COUNTRY_MEMBER_WITHOUT_TRIP_MEMBER",
        count:
          assignmentMismatch,
        detail:
          "A country assignment exists without the matching trip membership.",
      });
    }

    const invalidSettlementPartyCount =
      settlementRows.filter(
        (settlement) =>
          settlement.fromUserId === settlement.toUserId,
      ).length;

    if (invalidSettlementPartyCount > 0) {
      issues.push({
        type: "SETTLEMENT_SAME_PARTICIPANT",
        count: invalidSettlementPartyCount,
        detail:
          "A settlement has the same traveler as both payer and receiver.",
      });
    }

    const invalidSettlementAmountCount =
      settlementRows.filter(
        (settlement) => toNumber(settlement.amount) <= 0,
      ).length;

    if (invalidSettlementAmountCount > 0) {
      issues.push({
        type: "SETTLEMENT_INVALID_AMOUNT",
        count: invalidSettlementAmountCount,
        detail:
          "A settlement has a zero or negative payment amount.",
      });
    }

    const invalidSettledStateCount =
      settlementRows.filter(
        (settlement) =>
          settlement.status === "SETTLED" &&
          (!settlement.confirmedBy || !settlement.confirmedAt),
      ).length;

    if (invalidSettledStateCount > 0) {
      issues.push({
        type: "SETTLEMENT_CONFIRMATION_MISSING",
        count: invalidSettledStateCount,
        detail:
          "A completed settlement is missing receiver confirmation metadata.",
      });
    }

    const invalidPendingStateCount =
      settlementRows.filter(
        (settlement) =>
          settlement.status === "SENT" &&
          Boolean(settlement.confirmedAt),
      ).length;

    if (invalidPendingStateCount > 0) {
      issues.push({
        type: "SETTLEMENT_PENDING_WITH_CONFIRMATION",
        count: invalidPendingStateCount,
        detail:
          "A pending settlement already contains confirmation metadata and should be reviewed.",
      });
    }

    return {
      ok: issues.length === 0,
      checkedAt:
        new Date().toISOString(),
      issues,
    };
  } catch {
    return {
      ok: false,
      checkedAt:
        new Date().toISOString(),
      issues: [
        {
          type:
            "CONSISTENCY_CHECK_FAILED",
          count: 1,
          detail:
            "The database consistency scan could not complete.",
        },
      ],
    };
  }
}

export type PerformanceRouteSummary = {
  route: string;
  samples: number;
  averageMs: number;
  p95Ms: number;
  maxMs: number;
};

export type PerformanceSnapshot = {
  samples: number;
  averageMs: number;
  p95Ms: number;
  slowRequests: number;
  routes: PerformanceRouteSummary[];
};

function percentile95(
  values: number[],
): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort(
    (left, right) =>
      left - right,
  );
  const index = Math.min(
    sorted.length - 1,
    Math.ceil(
      sorted.length * 0.95,
    ) - 1,
  );

  return sorted[index] ?? 0;
}

export async function loadPerformanceSnapshot(): Promise<PerformanceSnapshot> {
  try {
    const rows = await db
      .select({
        route: apiMetrics.route,
        durationMs:
          apiMetrics.durationMs,
        createdAt:
          apiMetrics.createdAt,
      })
      .from(apiMetrics)
      .orderBy(
        desc(
          apiMetrics.createdAt,
        ),
      )
      .limit(300);

    const durations =
      rows.map(
        (row) =>
          row.durationMs,
      );
    const grouped = new Map<
      string,
      number[]
    >();

    for (const row of rows) {
      const values =
        grouped.get(row.route) ??
        [];
      values.push(
        row.durationMs,
      );
      grouped.set(
        row.route,
        values,
      );
    }

    const routes = [
      ...grouped.entries(),
    ]
      .map(
        ([
          route,
          values,
        ]): PerformanceRouteSummary => ({
          route,
          samples:
            values.length,
          averageMs:
            Math.round(
              values.reduce(
                (sum, value) =>
                  sum + value,
                0,
              ) /
                values.length,
            ),
          p95Ms:
            percentile95(
              values,
            ),
          maxMs:
            Math.max(...values),
        }),
      )
      .sort(
        (left, right) =>
          right.p95Ms -
          left.p95Ms,
      );

    return {
      samples:
        rows.length,
      averageMs:
        durations.length
          ? Math.round(
              durations.reduce(
                (
                  sum,
                  value,
                ) =>
                  sum + value,
                0,
              ) /
                durations.length,
            )
          : 0,
      p95Ms:
        percentile95(
          durations,
        ),
      slowRequests:
        durations.filter(
          (value) =>
            value >= 1500,
        ).length,
      routes,
    };
  } catch {
    return {
      samples: 0,
      averageMs: 0,
      p95Ms: 0,
      slowRequests: 0,
      routes: [],
    };
  }
}
