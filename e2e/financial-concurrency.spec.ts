import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

const ownerEmail = process.env.E2E_FINANCIAL_OWNER_EMAIL;
const ownerPassword =
  process.env.E2E_FINANCIAL_OWNER_PASSWORD;
const ownerUserId =
  process.env.E2E_FINANCIAL_OWNER_USER_ID;
const receiverUserId =
  process.env.E2E_FINANCIAL_RECEIVER_USER_ID;
const countryId =
  process.env.E2E_FINANCIAL_COUNTRY_ID;
const tripId = process.env.E2E_FINANCIAL_TRIP_ID;

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(ownerEmail ?? "");
  await page
    .getByLabel(/password/i)
    .fill(ownerPassword ?? "");
  await page
    .getByRole("button", { name: /sign in/i })
    .click();
  await page.waitForURL(/\/dashboard/);
}

async function postJson<T>(
  page: Page,
  url: string,
  body: unknown,
): Promise<{ status: number; payload: T }> {
  return page.evaluate(
    async ({ requestUrl, requestBody }) => {
      const response = await fetch(requestUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      return {
        status: response.status,
        payload: (await response.json()) as T,
      };
    },
    { requestUrl: url, requestBody: body },
  );
}

async function putJson<T>(
  page: Page,
  url: string,
  body: unknown,
): Promise<{ status: number; payload: T }> {
  return page.evaluate(
    async ({ requestUrl, requestBody }) => {
      const response = await fetch(requestUrl, {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      return {
        status: response.status,
        payload: (await response.json()) as T,
      };
    },
    { requestUrl: url, requestBody: body },
  );
}

function expenseBody(input: {
  clientRequestId: string;
  description: string;
  paidByUserId: string;
  splitUserId: string;
}) {
  return {
    clientRequestId: input.clientRequestId,
    countryId,
    expenseDate: "2026-09-08",
    category: "Food",
    description: input.description,
    transactionCurrency: "MYR",
    transactionAmount: 100,
    exchangeRate: 1,
    rateType: "DEFAULT",
    actualConvertedAmount: null,
    paidByUserId: input.paidByUserId,
    payers: [],
    paymentMethod: "",
    receiptUrl: "",
    receiptConfidence: null,
    receiptReviewStatus: "NOT_REQUIRED",
    notes: "",
    allowDuplicate: true,
    itemization: [],
    splitMode: "EQUAL",
    splits: [
      {
        userId: input.splitUserId,
        value: 1,
      },
    ],
  };
}

test.describe("financial API concurrency", () => {
  test.describe.configure({ mode: "serial" });

  test.skip(
    !ownerEmail ||
      !ownerPassword ||
      !ownerUserId ||
      !receiverUserId ||
      !countryId ||
      !tripId,
    "Use a disposable E2E trip and set all E2E_FINANCIAL_* fixture variables.",
  );

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-chrome",
      "Financial race tests use one disposable fixture and run once.",
    );

    await signIn(page);

    const switchTrip = await postJson<{ ok?: boolean }>(
      page,
      "/api/active-trip",
      { tripId },
    );
    expect(switchTrip.status).toBe(200);

    await postJson(
      page,
      `/api/trips/${encodeURIComponent(tripId ?? "")}/financial-close`,
      { action: "REOPEN" },
    );
  });

  test("same expense request ID is atomic and concurrent stale edits cannot both win", async ({
    page,
  }) => {
    const clientRequestId = randomUUID();
    const createBody = expenseBody({
      clientRequestId,
      description: `Concurrency expense ${clientRequestId}`,
      paidByUserId: ownerUserId ?? "",
      splitUserId: ownerUserId ?? "",
    });

    const [first, second] = await Promise.all([
      postJson<{ id: string; idempotent?: boolean }>(
        page,
        "/api/expenses",
        createBody,
      ),
      postJson<{ id: string; idempotent?: boolean }>(
        page,
        "/api/expenses",
        createBody,
      ),
    ]);

    expect([first.status, second.status].sort()).toEqual(
      [200, 201],
    );
    expect(first.payload.id).toBe(second.payload.id);

    const list = await page.evaluate(async () => {
      const response = await fetch("/api/expenses", {
        cache: "no-store",
      });
      return response.json() as Promise<{
        expenses: Array<{
          id: string;
          updatedAt: string;
        }>;
      }>;
    });
    const created = list.expenses.find(
      (expense) => expense.id === clientRequestId,
    );

    expect(created).toBeTruthy();

    const commonUpdate = {
      ...createBody,
      clientRequestId: undefined,
      expectedUpdatedAt: created?.updatedAt,
    };

    const [editA, editB] = await Promise.all([
      putJson<{ code?: string }>(
        page,
        `/api/expenses/${clientRequestId}`,
        {
          ...commonUpdate,
          description: `Editor A ${clientRequestId}`,
        },
      ),
      putJson<{ code?: string }>(
        page,
        `/api/expenses/${clientRequestId}`,
        {
          ...commonUpdate,
          description: `Editor B ${clientRequestId}`,
        },
      ),
    ]);

    expect([editA.status, editB.status].sort()).toEqual(
      [200, 409],
    );
    const stale =
      editA.status === 409 ? editA : editB;
    expect(stale.payload.code).toBe("STALE_EDIT");
  });

  test("concurrent settlement retries create one payment record", async ({
    page,
  }) => {
    const debtExpenseId = randomUUID();
    const debtExpense = expenseBody({
      clientRequestId: debtExpenseId,
      description: `Settlement race ${debtExpenseId}`,
      paidByUserId: receiverUserId ?? "",
      splitUserId: ownerUserId ?? "",
    });

    const created = await postJson<{ id: string }>(
      page,
      "/api/expenses",
      debtExpense,
    );
    expect([200, 201]).toContain(created.status);

    const requestId = randomUUID();
    const body = {
      requestId,
      countryId,
      counterpartyUserId: receiverUserId,
      action: "MARK_PAID",
      amount: 100,
    };

    const [first, second] = await Promise.all([
      postJson<{
        settlementId: string;
        idempotent?: boolean;
      }>(page, "/api/settlements", body),
      postJson<{
        settlementId: string;
        idempotent?: boolean;
      }>(page, "/api/settlements", body),
    ]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.payload.settlementId).toBe(requestId);
    expect(second.payload.settlementId).toBe(requestId);
    expect(
      Boolean(first.payload.idempotent) ||
        Boolean(second.payload.idempotent),
    ).toBe(true);
  });

  test("financial close and expense creation serialize on the trip lock", async ({
    page,
  }) => {
    const raceExpenseId = randomUUID();
    const raceExpense = expenseBody({
      clientRequestId: raceExpenseId,
      description: `Close race ${raceExpenseId}`,
      paidByUserId: ownerUserId ?? "",
      splitUserId: ownerUserId ?? "",
    });

    const [closeResult, createResult] =
      await Promise.all([
        postJson<{ ok?: boolean }>(
          page,
          `/api/trips/${encodeURIComponent(tripId ?? "")}/financial-close`,
          { action: "CLOSE" },
        ),
        postJson<{ id?: string; code?: string }>(
          page,
          "/api/expenses",
          raceExpense,
        ),
      ]);

    expect(closeResult.status).toBe(200);
    expect([201, 423]).toContain(createResult.status);

    if (createResult.status === 423) {
      expect(createResult.payload.code).toBe(
        "TRIP_FINANCIALS_CLOSED",
      );
    }

    const state = await page.evaluate(
      async (id) => {
        const response = await fetch(
          `/api/trips/${encodeURIComponent(id)}/financial-close`,
          { cache: "no-store" },
        );
        return response.json() as Promise<{
          status: "OPEN" | "CLOSED";
        }>;
      },
      tripId ?? "",
    );

    expect(state.status).toBe("CLOSED");

    await postJson(
      page,
      `/api/trips/${encodeURIComponent(tripId ?? "")}/financial-close`,
      { action: "REOPEN" },
    );
  });
});
