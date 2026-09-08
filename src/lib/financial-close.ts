import { createHash } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { createTransactionalDatabase } from "@/db/transaction";
import { countries, expensePayers, expenseSplits, expenses, trips, user } from "@/db/schema";
import { recordActivity } from "@/lib/activity";
import { buildExpenseSummary } from "@/lib/dashboard";
import { sendPushToCountry } from "@/lib/push";
import { canManageTrip } from "@/lib/trip-management";

export type FinancialStatus = "OPEN" | "CLOSED";

export type TripFinancialState = {
  tripId: string;
  tripName: string;
  status: FinancialStatus;
  version: number;
  closedAt: string | null;
  closedByUserId: string | null;
  closedByName: string | null;
  snapshotHash: string | null;
};

export type FinancialSnapshot = {
  version: number;
  closedAt: string;
  closedByUserId: string;
  totalExpense: number;
  outstandingDirections: number;
  recommendedTransfers: number;
  settledTransfers: number;
  smartPlans: Array<{
    countryId: string;
    countryName: string;
    currency: string;
    originalTransferCount: number;
    optimizedTransferCount: number;
    optimizationMode: "EXACT" | "SIMPLIFIED";
    optimizedTransfers: Array<{
      fromUserId: string;
      fromName: string;
      toUserId: string;
      toName: string;
      amount: number;
    }>;
  }>;
  checksum: string;
};

type ManagementUser = {
  id: string;
  role?: string | null;
  name?: string | null;
};

function normalizeStatus(value: string | null | undefined): FinancialStatus {
  return value === "CLOSED" ? "CLOSED" : "OPEN";
}

function snapshotChecksum(value: Omit<FinancialSnapshot, "checksum">): string {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")
    .slice(0, 24);
}

export async function getTripFinancialState(
  tripId: string,
): Promise<TripFinancialState | null> {
  if (!tripId) {
    return null;
  }

  const rows = await db
    .select({
      tripId: trips.id,
      tripName: trips.name,
      status: trips.financialStatus,
      version: trips.financialVersion,
      closedAt: trips.financialClosedAt,
      closedByUserId: trips.financialClosedBy,
      snapshot: trips.financialSnapshot,
      closedByName: user.name,
    })
    .from(trips)
    .leftJoin(user, eq(trips.financialClosedBy, user.id))
    .where(eq(trips.id, tripId))
    .limit(1);

  const row = rows[0];

  if (!row) {
    return null;
  }

  let snapshotHash: string | null = null;

  if (row.snapshot) {
    try {
      const parsed = JSON.parse(row.snapshot) as { checksum?: unknown };
      snapshotHash = typeof parsed.checksum === "string" ? parsed.checksum : null;
    } catch {
      snapshotHash = null;
    }
  }

  return {
    tripId: row.tripId,
    tripName: row.tripName,
    status: normalizeStatus(row.status),
    version: Math.max(0, row.version ?? 0),
    closedAt: row.closedAt?.toISOString() ?? null,
    closedByUserId: row.closedByUserId ?? null,
    closedByName: row.closedByName ?? null,
    snapshotHash,
  };
}

export async function isTripExpenseLedgerOpen(tripId: string): Promise<boolean> {
  const rows = await db
    .select({ status: trips.financialStatus })
    .from(trips)
    .where(eq(trips.id, tripId))
    .limit(1);

  return normalizeStatus(rows[0]?.status) === "OPEN";
}

export async function closedTripReadOnlyResponse(
  tripId: string,
): Promise<Response | null> {
  if (await isTripExpenseLedgerOpen(tripId)) return null;

  return Response.json(
    {
      error:
        "This Trip is closed and read-only. Reopen it from Settlement before changing Trip details, travelers, invites, budgets, Plan, Inbox, expenses or live location.",
      code: "TRIP_CLOSED_READ_ONLY",
    },
    { status: 423 },
  );
}

export async function closedCountryReadOnlyResponse(
  countryId: string,
): Promise<Response | null> {
  const row = (
    await db
      .select({ tripId: countries.tripId })
      .from(countries)
      .where(eq(countries.id, countryId))
      .limit(1)
  )[0];

  return row ? closedTripReadOnlyResponse(row.tripId) : null;
}

export async function expenseLedgerLockedResponse(
  tripId: string,
): Promise<Response | null> {
  if (await isTripExpenseLedgerOpen(tripId)) {
    return null;
  }

  return Response.json(
    {
      error:
        "Trip expenses are locked for final settlement. Ask the Trip Owner to reopen the financial ledger before adding, editing or deleting expenses.",
      code: "TRIP_FINANCIALS_CLOSED",
    },
    { status: 423 },
  );
}

function moneyCents(value: string | null): number {
  return Math.round(
    (Number(value ?? 0) + Number.EPSILON) * 100,
  );
}

async function runBestEffortSideEffects(
  tasks: Array<Promise<unknown>>,
): Promise<void> {
  await Promise.allSettled(tasks);
}

export async function closeTripFinancials(
  currentUser: ManagementUser,
  tripId: string,
): Promise<TripFinancialState> {
  if (!(await canManageTrip(currentUser, tripId))) {
    throw new Error(
      "Only the Trip Owner or System Admin can close this Trip.",
    );
  }

  const transactional = createTransactionalDatabase();
  let closeResult:
    | {
        kind: "alreadyClosed";
      }
    | {
        kind: "closed";
        tripName: string;
        countryRows: Array<{
          id: string;
          name: string;
          currency: string;
        }>;
        snapshot: FinancialSnapshot;
      };

  try {
    closeResult =
      await transactional.database.transaction(
        async (tx) => {
          const lockedTrip = (
            await tx
              .select({
                id: trips.id,
                name: trips.name,
                baseCurrency: trips.baseCurrency,
                financialStatus:
                  trips.financialStatus,
                financialVersion:
                  trips.financialVersion,
              })
              .from(trips)
              .where(eq(trips.id, tripId))
              .for("update")
          )[0];

          if (!lockedTrip) {
            throw new Error("Trip not found.");
          }

          if (
            normalizeStatus(
              lockedTrip.financialStatus,
            ) === "CLOSED"
          ) {
            return {
              kind: "alreadyClosed" as const,
            };
          }

          const expenseRows = await tx
            .select({
              id: expenses.id,
              convertedAmount:
                expenses.convertedAmount,
              actualConvertedAmount:
                expenses.actualConvertedAmount,
            })
            .from(expenses)
            .where(eq(expenses.tripId, tripId));
          const expenseIds = expenseRows.map(
            (expense) => expense.id,
          );

          const splitRows = expenseIds.length
            ? await tx
                .select({
                  expenseId:
                    expenseSplits.expenseId,
                  shareAmountBase:
                    expenseSplits.shareAmountBase,
                })
                .from(expenseSplits)
                .where(
                  inArray(
                    expenseSplits.expenseId,
                    expenseIds,
                  ),
                )
            : [];
          const payerRows = expenseIds.length
            ? await tx
                .select({
                  expenseId:
                    expensePayers.expenseId,
                  amountBase:
                    expensePayers.amountBase,
                })
                .from(expensePayers)
                .where(
                  inArray(
                    expensePayers.expenseId,
                    expenseIds,
                  ),
                )
            : [];

          const splitTotals = new Map<
            string,
            { count: number; cents: number }
          >();
          const payerTotals = new Map<
            string,
            { count: number; cents: number }
          >();

          for (const split of splitRows) {
            const current =
              splitTotals.get(split.expenseId) ?? {
                count: 0,
                cents: 0,
              };
            current.count += 1;
            current.cents += moneyCents(
              split.shareAmountBase,
            );
            splitTotals.set(
              split.expenseId,
              current,
            );
          }

          for (const payer of payerRows) {
            const current =
              payerTotals.get(payer.expenseId) ?? {
                count: 0,
                cents: 0,
              };
            current.count += 1;
            current.cents += moneyCents(
              payer.amountBase,
            );
            payerTotals.set(
              payer.expenseId,
              current,
            );
          }

          for (const expense of expenseRows) {
            const expectedCents = moneyCents(
              expense.actualConvertedAmount ??
                expense.convertedAmount,
            );
            const split =
              splitTotals.get(expense.id) ?? {
                count: 0,
                cents: 0,
              };
            const payer =
              payerTotals.get(expense.id) ?? {
                count: 0,
                cents: 0,
              };

            if (split.count === 0) {
              throw new Error(
                `Expense ${expense.id} has no split rows. Recover or remove it before locking the trip for final settlement.`,
              );
            }

            if (payer.count === 0) {
              throw new Error(
                `Expense ${expense.id} has no payer rows. Recover or remove it before locking the trip for final settlement.`,
              );
            }

            if (split.cents !== expectedCents) {
              throw new Error(
                `Expense ${expense.id} split total does not match its settlement amount. Correct the expense before locking the trip.`,
              );
            }

            if (payer.cents !== expectedCents) {
              throw new Error(
                `Expense ${expense.id} payer total does not match its settlement amount. Correct the expense before locking the trip.`,
              );
            }
          }

          const countryRows = await tx
            .select({
              id: countries.id,
              name: countries.name,
              currency: trips.baseCurrency,
            })
            .from(countries)
            .innerJoin(
              trips,
              eq(countries.tripId, trips.id),
            )
            .where(
              eq(countries.tripId, tripId),
            );

          /*
           * Every expense/settlement mutation locks this same trip row before
           * writing. Keeping this lock while the read-only summary is built
           * gives the snapshot a stable financial boundary.
           */
          const summary =
            await buildExpenseSummary(
              countryRows.map(
                (country) => country.id,
              ),
            );
          const closedAt = new Date();
          const nextVersion =
            Math.max(
              0,
              lockedTrip.financialVersion ?? 0,
            ) + 1;

          const snapshotWithoutChecksum: Omit<
            FinancialSnapshot,
            "checksum"
          > = {
            version: nextVersion,
            closedAt: closedAt.toISOString(),
            closedByUserId: currentUser.id,
            totalExpense: summary.total,
            outstandingDirections:
              summary.smartPlans.reduce(
                (sum, plan) =>
                  sum +
                  plan.originalTransferCount,
                0,
              ),
            recommendedTransfers:
              summary.smartPlans.reduce(
                (sum, plan) =>
                  sum +
                  plan.optimizedTransferCount,
                0,
              ),
            settledTransfers:
              summary.settledSettlements.length,
            smartPlans: summary.smartPlans.map(
              (plan) => ({
                countryId: plan.countryId,
                countryName:
                  plan.countryName,
                currency: plan.currency,
                originalTransferCount:
                  plan.originalTransferCount,
                optimizedTransferCount:
                  plan.optimizedTransferCount,
                optimizationMode:
                  plan.optimizationMode,
                optimizedTransfers:
                  plan.optimizedTransfers.map(
                    (transfer) => ({
                      fromUserId:
                        transfer.fromUserId,
                      fromName:
                        transfer.fromName,
                      toUserId:
                        transfer.toUserId,
                      toName:
                        transfer.toName,
                      amount: transfer.amount,
                    }),
                  ),
              }),
            ),
          };
          const snapshot: FinancialSnapshot = {
            ...snapshotWithoutChecksum,
            checksum: snapshotChecksum(
              snapshotWithoutChecksum,
            ),
          };

          const updated = await tx
            .update(trips)
            .set({
              financialStatus: "CLOSED",
              financialVersion: nextVersion,
              financialClosedAt: closedAt,
              financialClosedBy:
                currentUser.id,
              financialSnapshot:
                JSON.stringify(snapshot),
            })
            .where(eq(trips.id, tripId))
            .returning({ id: trips.id });

          if (!updated[0]) {
            throw new Error(
              "Trip financial state could not be locked.",
            );
          }

          return {
            kind: "closed" as const,
            tripName: lockedTrip.name,
            countryRows,
            snapshot,
          };
        },
      );
  } finally {
    await transactional.close();
  }

  if (closeResult.kind === "closed") {
    await runBestEffortSideEffects([
      recordActivity({
        actorUserId: currentUser.id,
        action: "FINANCIALS_CLOSED",
        entityType: "TRIP",
        entityId: tripId,
        tripId,
        summary: `${currentUser.name ?? "Trip Owner"} closed the Trip as read-only for final settlement.`,
        metadata: {
          financialVersion:
            closeResult.snapshot.version,
          snapshotHash:
            closeResult.snapshot.checksum,
        },
      }),
      ...closeResult.countryRows.map(
        (country) =>
          sendPushToCountry(
            country.id,
            currentUser.id,
            "TRIPS",
            {
              title:
                "Trip closed · read-only",
              body: `${closeResult.tripName} is ready for final settlement. Trip changes are paused until the owner reopens it.`,
              url: `/settlements?tripId=${encodeURIComponent(tripId)}`,
              tag: `trip-financial-close-${tripId}`,
            },
          ),
      ),
    ]);
  }

  const updated =
    await getTripFinancialState(tripId);

  if (!updated) {
    throw new Error(
      "Trip financial state could not be loaded after locking.",
    );
  }

  return updated;
}

export async function reopenTripFinancials(
  currentUser: ManagementUser,
  tripId: string,
): Promise<TripFinancialState> {
  if (!(await canManageTrip(currentUser, tripId))) {
    throw new Error(
      "Only the Trip Owner or System Admin can reopen this Trip.",
    );
  }

  const transactional =
    createTransactionalDatabase();
  let reopenResult:
    | {
        kind: "alreadyOpen";
      }
    | {
        kind: "reopened";
        tripName: string;
        priorVersion: number;
        priorSnapshotHash: string | null;
        countryIds: string[];
      };

  try {
    reopenResult =
      await transactional.database.transaction(
        async (tx) => {
          const lockedTrip = (
            await tx
              .select({
                id: trips.id,
                name: trips.name,
                financialStatus:
                  trips.financialStatus,
                financialVersion:
                  trips.financialVersion,
                financialSnapshot:
                  trips.financialSnapshot,
              })
              .from(trips)
              .where(eq(trips.id, tripId))
              .for("update")
          )[0];

          if (!lockedTrip) {
            throw new Error("Trip not found.");
          }

          if (
            normalizeStatus(
              lockedTrip.financialStatus,
            ) === "OPEN"
          ) {
            return {
              kind: "alreadyOpen" as const,
            };
          }

          let priorSnapshotHash:
            | string
            | null = null;

          if (lockedTrip.financialSnapshot) {
            try {
              const parsed = JSON.parse(
                lockedTrip.financialSnapshot,
              ) as { checksum?: unknown };
              priorSnapshotHash =
                typeof parsed.checksum ===
                "string"
                  ? parsed.checksum
                  : null;
            } catch {
              priorSnapshotHash = null;
            }
          }

          await tx
            .update(trips)
            .set({
              financialStatus: "OPEN",
              financialClosedAt: null,
              financialClosedBy: null,
            })
            .where(eq(trips.id, tripId));

          const countryRows = await tx
            .select({ id: countries.id })
            .from(countries)
            .where(
              eq(countries.tripId, tripId),
            );

          return {
            kind: "reopened" as const,
            tripName: lockedTrip.name,
            priorVersion: Math.max(
              0,
              lockedTrip.financialVersion ?? 0,
            ),
            priorSnapshotHash,
            countryIds: countryRows.map(
              (country) => country.id,
            ),
          };
        },
      );
  } finally {
    await transactional.close();
  }

  if (reopenResult.kind === "reopened") {
    await runBestEffortSideEffects([
      recordActivity({
        actorUserId: currentUser.id,
        action: "FINANCIALS_REOPENED",
        entityType: "TRIP",
        entityId: tripId,
        tripId,
        summary: `${currentUser.name ?? "Trip Owner"} reopened the Trip for corrections.`,
        metadata: {
          priorFinancialVersion:
            reopenResult.priorVersion,
          priorSnapshotHash:
            reopenResult.priorSnapshotHash,
        },
      }),
      ...reopenResult.countryIds.map(
        (countryId) =>
          sendPushToCountry(
            countryId,
            currentUser.id,
            "TRIPS",
            {
              title: "Trip reopened",
              body: `${reopenResult.tripName} can accept Trip, Plan and expense changes again. Smart Settlement will update automatically.`,
              url: "/expenses",
              tag: `trip-financial-reopen-${tripId}`,
            },
          ),
      ),
    ]);
  }

  const updated =
    await getTripFinancialState(tripId);

  if (!updated) {
    throw new Error(
      "Trip financial state could not be loaded after reopening.",
    );
  }

  return updated;
}
