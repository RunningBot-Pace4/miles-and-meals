import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTransactionalDatabase } from "@/db/transaction";
import {
  countries,
  expensePayers,
  expenseSplits,
  expenses,
  settlements,
  trips,
  user,
} from "@/db/schema";

const connectionString = process.env.TEST_DATABASE_URL;
const integrationDescribe = connectionString
  ? describe
  : describe.skip;

integrationDescribe("financial transaction concurrency", () => {
  const ownerId = `test-owner-${randomUUID()}`;
  const travelerId = `test-traveler-${randomUUID()}`;
  let tripId = "";
  let countryId = "";

  async function withDb<T>(
    callback: (
      database: ReturnType<typeof createTransactionalDatabase>["database"],
    ) => Promise<T>,
  ): Promise<T> {
    const client = createTransactionalDatabase(connectionString);

    try {
      return await callback(client.database);
    } finally {
      await client.close();
    }
  }

  beforeAll(async () => {
    await withDb(async (database) => {
      await database.transaction(async (tx) => {
        await tx.insert(user).values([
          {
            id: ownerId,
            name: "Concurrency Owner",
            email: `${ownerId}@example.test`,
          },
          {
            id: travelerId,
            name: "Concurrency Traveler",
            email: `${travelerId}@example.test`,
          },
        ]);

        const createdTrips = await tx
          .insert(trips)
          .values({
            name: "Concurrency Fixture",
            baseCurrency: "MYR",
            createdBy: ownerId,
          })
          .returning({ id: trips.id });
        tripId = createdTrips[0]?.id ?? "";

        const createdCountries = await tx
          .insert(countries)
          .values({
            tripId,
            name: "Malaysia",
            code: "MY",
            currencyCode: "MYR",
            defaultExchangeRate: "1",
          })
          .returning({ id: countries.id });
        countryId = createdCountries[0]?.id ?? "";
      });
    });
  });

  afterAll(async () => {
    if (!tripId) return;

    await withDb(async (database) => {
      await database.transaction(async (tx) => {
        await tx.delete(trips).where(eq(trips.id, tripId));
        await tx
          .delete(user)
          .where(eq(user.id, travelerId));
        await tx.delete(user).where(eq(user.id, ownerId));
      });
    });
  });

  it("rolls back an interrupted expense before any partial parent survives", async () => {
    const expenseId = randomUUID();

    await expect(
      withDb(async (database) =>
        database.transaction(async (tx) => {
          await tx
            .select({ id: trips.id })
            .from(trips)
            .where(eq(trips.id, tripId))
            .for("update");

          await tx.insert(expenses).values({
            id: expenseId,
            tripId,
            countryId,
            expenseDate: "2026-09-08",
            category: "Food",
            description: "Interrupted save",
            transactionCurrency: "MYR",
            transactionAmount: "100.00",
            exchangeRate: "1.0000000000",
            rateType: "DEFAULT",
            baseCurrency: "MYR",
            convertedAmount: "100.00",
            splitMode: "EQUAL",
            paidByUserId: ownerId,
            createdBy: ownerId,
          });

          throw new Error("simulated write interruption");
        }),
      ),
    ).rejects.toThrow("simulated write interruption");

    const surviving = await withDb((database) =>
      database
        .select({ id: expenses.id })
        .from(expenses)
        .where(eq(expenses.id, expenseId)),
    );

    expect(surviving).toHaveLength(0);
  });

  it("serializes duplicate payment attempts so only one pending payment is created", async () => {
    const amount = "25.00";

    async function markPaid(requestId: string) {
      return withDb((database) =>
        database.transaction(async (tx) => {
          await tx
            .select({ id: trips.id })
            .from(trips)
            .where(eq(trips.id, tripId))
            .for("update");

          const pending = await tx
            .select({ id: settlements.id })
            .from(settlements)
            .where(
              and(
                eq(settlements.countryId, countryId),
                eq(settlements.fromUserId, ownerId),
                eq(settlements.toUserId, travelerId),
                eq(settlements.status, "SENT"),
              ),
            )
            .limit(1);

          if (pending[0]) {
            return pending[0].id;
          }

          const inserted = await tx
            .insert(settlements)
            .values({
              id: requestId,
              tripId,
              countryId,
              fromUserId: ownerId,
              toUserId: travelerId,
              amount,
              currency: "MYR",
              status: "SENT",
              initiatedBy: ownerId,
            })
            .returning({ id: settlements.id });

          return inserted[0]?.id ?? "";
        }),
      );
    }

    const [firstId, secondId] = await Promise.all([
      markPaid(randomUUID()),
      markPaid(randomUUID()),
    ]);

    expect(firstId).toBe(secondId);

    const rows = await withDb((database) =>
      database
        .select({ id: settlements.id })
        .from(settlements)
        .where(
          and(
            eq(settlements.countryId, countryId),
            eq(settlements.fromUserId, ownerId),
            eq(settlements.toUserId, travelerId),
            eq(settlements.status, "SENT"),
          ),
        ),
    );

    expect(rows).toHaveLength(1);

    await withDb((database) =>
      database
        .delete(settlements)
        .where(eq(settlements.id, firstId)),
    );
  });

  it("allows only one concurrent edit from the same expected updatedAt", async () => {
    const expenseId = randomUUID();
    let expectedUpdatedAt = new Date();

    await withDb((database) =>
      database.transaction(async (tx) => {
        const inserted = await tx
          .insert(expenses)
          .values({
            id: expenseId,
            tripId,
            countryId,
            expenseDate: "2026-09-08",
            category: "Food",
            description: "Original",
            transactionCurrency: "MYR",
            transactionAmount: "100.00",
            exchangeRate: "1.0000000000",
            rateType: "DEFAULT",
            baseCurrency: "MYR",
            convertedAmount: "100.00",
            splitMode: "EQUAL",
            paidByUserId: ownerId,
            createdBy: ownerId,
          })
          .returning({ updatedAt: expenses.updatedAt });

        expectedUpdatedAt =
          inserted[0]?.updatedAt ?? expectedUpdatedAt;

        await tx.insert(expenseSplits).values({
          expenseId,
          userId: ownerId,
          shareAmountBase: "100.00",
        });
        await tx.insert(expensePayers).values({
          expenseId,
          userId: ownerId,
          amountBase: "100.00",
        });
      }),
    );

    async function edit(description: string) {
      return withDb((database) =>
        database.transaction(async (tx) => {
          await tx
            .select({ id: trips.id })
            .from(trips)
            .where(eq(trips.id, tripId))
            .for("update");

          const current = (
            await tx
              .select({ updatedAt: expenses.updatedAt })
              .from(expenses)
              .where(eq(expenses.id, expenseId))
              .limit(1)
          )[0];

          if (
            !current ||
            current.updatedAt.getTime() !==
              expectedUpdatedAt.getTime()
          ) {
            return "STALE" as const;
          }

          const updated = await tx
            .update(expenses)
            .set({
              description,
              updatedAt: new Date(
                current.updatedAt.getTime() + 1000,
              ),
            })
            .where(
              and(
                eq(expenses.id, expenseId),
                eq(
                  expenses.updatedAt,
                  current.updatedAt,
                ),
              ),
            )
            .returning({ id: expenses.id });

          return updated[0]
            ? ("UPDATED" as const)
            : ("STALE" as const);
        }),
      );
    }

    const results = await Promise.all([
      edit("Editor A"),
      edit("Editor B"),
    ]);

    expect(results.sort()).toEqual(
      ["STALE", "UPDATED"].sort(),
    );

    await withDb((database) =>
      database
        .delete(expenses)
        .where(eq(expenses.id, expenseId)),
    );
  });

  it("prevents an expense from slipping in after financial close wins the trip lock", async () => {
    let closeHasLock!: () => void;
    const closeLocked = new Promise<void>((resolve) => {
      closeHasLock = resolve;
    });
    let releaseClose!: () => void;
    const allowCloseToCommit = new Promise<void>((resolve) => {
      releaseClose = resolve;
    });

    const closing = withDb((database) =>
      database.transaction(async (tx) => {
        await tx
          .select({ id: trips.id })
          .from(trips)
          .where(eq(trips.id, tripId))
          .for("update");

        closeHasLock();
        await allowCloseToCommit;

        await tx
          .update(trips)
          .set({ financialStatus: "CLOSED" })
          .where(eq(trips.id, tripId));
      }),
    );

    await closeLocked;

    const blockedExpenseId = randomUUID();
    const creating = withDb((database) =>
      database.transaction(async (tx) => {
        const lockedTrip = (
          await tx
            .select({
              financialStatus: trips.financialStatus,
            })
            .from(trips)
            .where(eq(trips.id, tripId))
            .for("update")
        )[0];

        if (lockedTrip?.financialStatus === "CLOSED") {
          return "BLOCKED" as const;
        }

        await tx.insert(expenses).values({
          id: blockedExpenseId,
          tripId,
          countryId,
          expenseDate: "2026-09-08",
          category: "Food",
          description: "Should not exist",
          transactionCurrency: "MYR",
          transactionAmount: "10.00",
          exchangeRate: "1.0000000000",
          rateType: "DEFAULT",
          baseCurrency: "MYR",
          convertedAmount: "10.00",
          splitMode: "EQUAL",
          paidByUserId: ownerId,
          createdBy: ownerId,
        });

        return "CREATED" as const;
      }),
    );

    releaseClose();
    await closing;
    await expect(creating).resolves.toBe("BLOCKED");

    const rows = await withDb((database) =>
      database
        .select({ id: expenses.id })
        .from(expenses)
        .where(eq(expenses.id, blockedExpenseId)),
    );
    expect(rows).toHaveLength(0);

    await withDb((database) =>
      database
        .update(trips)
        .set({ financialStatus: "OPEN" })
        .where(eq(trips.id, tripId)),
    );
  });
});
