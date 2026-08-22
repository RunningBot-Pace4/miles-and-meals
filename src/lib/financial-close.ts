import { createHash } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { countries, expenseSplits, expenses, trips, user } from "@/db/schema";
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

async function loadCountryRows(tripId: string) {
  return db
    .select({
      id: countries.id,
      name: countries.name,
      currency: trips.baseCurrency,
    })
    .from(countries)
    .innerJoin(trips, eq(countries.tripId, trips.id))
    .where(eq(countries.tripId, tripId));
}

export async function closeTripFinancials(
  currentUser: ManagementUser,
  tripId: string,
): Promise<TripFinancialState> {
  if (!(await canManageTrip(currentUser, tripId))) {
    throw new Error("Only the Trip Owner or System Admin can lock trip expenses.");
  }

  const current = await getTripFinancialState(tripId);

  if (!current) {
    throw new Error("Trip not found.");
  }

  if (current.status === "CLOSED") {
    return current;
  }

  const incompleteExpense = await db
    .select({ id: expenses.id })
    .from(expenses)
    .leftJoin(expenseSplits, eq(expenseSplits.expenseId, expenses.id))
    .where(
      and(
        eq(expenses.tripId, tripId),
        isNull(expenseSplits.expenseId),
      ),
    )
    .limit(1);

  if (incompleteExpense.length) {
    throw new Error(
      "One expense is still incomplete and has no split rows. Recover or remove that expense before locking the trip for final settlement.",
    );
  }

  const countryRows = await loadCountryRows(tripId);
  const summary = await buildExpenseSummary(countryRows.map((country) => country.id));
  const closedAt = new Date();
  const nextVersion = current.version + 1;

  const snapshotWithoutChecksum: Omit<FinancialSnapshot, "checksum"> = {
    version: nextVersion,
    closedAt: closedAt.toISOString(),
    closedByUserId: currentUser.id,
    totalExpense: summary.total,
    outstandingDirections: summary.smartPlans.reduce(
      (sum, plan) => sum + plan.originalTransferCount,
      0,
    ),
    recommendedTransfers: summary.smartPlans.reduce(
      (sum, plan) => sum + plan.optimizedTransferCount,
      0,
    ),
    settledTransfers: summary.settledSettlements.length,
    smartPlans: summary.smartPlans.map((plan) => ({
      countryId: plan.countryId,
      countryName: plan.countryName,
      currency: plan.currency,
      originalTransferCount: plan.originalTransferCount,
      optimizedTransferCount: plan.optimizedTransferCount,
      optimizationMode: plan.optimizationMode,
      optimizedTransfers: plan.optimizedTransfers.map((transfer) => ({
        fromUserId: transfer.fromUserId,
        fromName: transfer.fromName,
        toUserId: transfer.toUserId,
        toName: transfer.toName,
        amount: transfer.amount,
      })),
    })),
  };
  const snapshot: FinancialSnapshot = {
    ...snapshotWithoutChecksum,
    checksum: snapshotChecksum(snapshotWithoutChecksum),
  };

  await db
    .update(trips)
    .set({
      financialStatus: "CLOSED",
      financialVersion: nextVersion,
      financialClosedAt: closedAt,
      financialClosedBy: currentUser.id,
      financialSnapshot: JSON.stringify(snapshot),
    })
    .where(eq(trips.id, tripId));

  await recordActivity({
    actorUserId: currentUser.id,
    action: "FINANCIALS_CLOSED",
    entityType: "TRIP",
    entityId: tripId,
    tripId,
    summary: `${currentUser.name ?? "Trip Owner"} locked trip expenses for final settlement.`,
    metadata: {
      financialVersion: nextVersion,
      snapshotHash: snapshot.checksum,
    },
  });

  await Promise.all(
    countryRows.map((country) =>
      sendPushToCountry(country.id, currentUser.id, "TRIPS", {
        title: "Trip expenses locked",
        body: `${current.tripName} is ready for final settlement. New expense changes are paused until the owner reopens the ledger.`,
        url: "/settlements",
        tag: `trip-financial-close-${tripId}`,
      }),
    ),
  );

  const updated = await getTripFinancialState(tripId);

  if (!updated) {
    throw new Error("Trip financial state could not be loaded after locking.");
  }

  return updated;
}

export async function reopenTripFinancials(
  currentUser: ManagementUser,
  tripId: string,
): Promise<TripFinancialState> {
  if (!(await canManageTrip(currentUser, tripId))) {
    throw new Error("Only the Trip Owner or System Admin can reopen trip expenses.");
  }

  const current = await getTripFinancialState(tripId);

  if (!current) {
    throw new Error("Trip not found.");
  }

  if (current.status === "OPEN") {
    return current;
  }

  await db
    .update(trips)
    .set({
      financialStatus: "OPEN",
      financialClosedAt: null,
      financialClosedBy: null,
    })
    .where(eq(trips.id, tripId));

  const countryRows = await loadCountryRows(tripId);

  await recordActivity({
    actorUserId: currentUser.id,
    action: "FINANCIALS_REOPENED",
    entityType: "TRIP",
    entityId: tripId,
    tripId,
    summary: `${currentUser.name ?? "Trip Owner"} reopened trip expenses for corrections.`,
    metadata: {
      priorFinancialVersion: current.version,
      priorSnapshotHash: current.snapshotHash,
    },
  });

  await Promise.all(
    countryRows.map((country) =>
      sendPushToCountry(country.id, currentUser.id, "TRIPS", {
        title: "Trip expenses reopened",
        body: `${current.tripName} can accept expense changes again. Smart Settlement will update automatically.`,
        url: "/expenses",
        tag: `trip-financial-reopen-${tripId}`,
      }),
    ),
  );

  const updated = await getTripFinancialState(tripId);

  if (!updated) {
    throw new Error("Trip financial state could not be loaded after reopening.");
  }

  return updated;
}
