import { describe, expect, it } from "vitest";
import {
  buildIndividualPaymentLedgers,
} from "@/lib/individual-payment-ledger";
import type {
  SettlementLiveData,
  SerializedSettlementRecord,
} from "@/lib/settlement-live";

function payment(
  input: Partial<SerializedSettlementRecord> &
    Pick<SerializedSettlementRecord, "id" | "amount" | "status" | "sentAt">,
): SerializedSettlementRecord {
  return {
    countryId: "country-1",
    countryName: "Vietnam",
    tripId: "trip-1",
    tripName: "Vietnam - Working Trip",
    currency: "MYR",
    fromUserId: "me",
    fromName: "JY",
    toUserId: "friend",
    toName: "Juehua",
    confirmedAt: input.status === "SETTLED" ? input.sentAt : null,
    ...input,
  };
}

function data(
  input: Partial<SettlementLiveData>,
): SettlementLiveData {
  return {
    baseCurrency: "MYR",
    people: [],
    waitingTransfers: [],
    pendingSettlements: [],
    settledSettlements: [],
    smartPlans: [],
    ...input,
  };
}

describe("individual payment ledger", () => {
  it("keeps three payment transactions separate with a running balance", () => {
    const ledgers = buildIndividualPaymentLedgers(
      data({
        settledSettlements: [
          payment({
            id: "payment-1",
            amount: 40,
            status: "SETTLED",
            sentAt: "2026-09-01T10:00:00.000Z",
          }),
          payment({
            id: "payment-2",
            amount: 30,
            status: "SETTLED",
            sentAt: "2026-09-02T10:00:00.000Z",
          }),
        ],
        pendingSettlements: [
          payment({
            id: "payment-3",
            amount: 20,
            status: "SENT",
            sentAt: "2026-09-03T10:00:00.000Z",
          }),
        ],
        waitingTransfers: [
          {
            countryId: "country-1",
            countryName: "Vietnam",
            tripId: "trip-1",
            tripName: "Vietnam - Working Trip",
            currency: "MYR",
            fromUserId: "me",
            fromName: "JY",
            toUserId: "friend",
            toName: "Juehua",
            amount: 10,
          },
        ],
      }),
      "me",
    );

    expect(ledgers).toHaveLength(1);
    expect(ledgers[0]).toMatchObject({
      direction: "PAY",
      counterpartyName: "Juehua",
      totalAmount: 100,
      confirmedAmount: 70,
      pendingAmount: 20,
      remainingAmount: 10,
      openAmount: 30,
      transactionCount: 3,
      pendingCount: 1,
      settledCount: 2,
      status: "PARTIAL_PENDING",
    });
    expect(ledgers[0]?.transactions).toEqual([
      expect.objectContaining({
        id: "payment-1",
        sequence: 1,
        progressStatus: "PARTIAL",
        confirmationStatus: "CONFIRMED",
        remainingAfter: 60,
      }),
      expect.objectContaining({
        id: "payment-2",
        sequence: 2,
        progressStatus: "PARTIAL",
        confirmationStatus: "CONFIRMED",
        remainingAfter: 30,
      }),
      expect.objectContaining({
        id: "payment-3",
        sequence: 3,
        progressStatus: "PARTIAL",
        confirmationStatus: "PENDING",
        remainingAfter: 10,
      }),
    ]);
  });

  it("marks the final confirmed transaction as fully settled", () => {
    const ledgers = buildIndividualPaymentLedgers(
      data({
        settledSettlements: [
          payment({
            id: "payment-1",
            amount: 40,
            status: "SETTLED",
            sentAt: "2026-09-01T10:00:00.000Z",
          }),
          payment({
            id: "payment-2",
            amount: 60,
            status: "SETTLED",
            sentAt: "2026-09-02T10:00:00.000Z",
          }),
        ],
      }),
      "me",
    );

    expect(ledgers[0]).toMatchObject({
      openAmount: 0,
      status: "SETTLED",
    });
    expect(ledgers[0]?.transactions[1]).toMatchObject({
      progressStatus: "FULL",
      remainingAfter: 0,
    });
  });

  it("distinguishes a full payment that still awaits receiver confirmation", () => {
    const ledgers = buildIndividualPaymentLedgers(
      data({
        pendingSettlements: [
          payment({
            id: "payment-1",
            amount: 100,
            status: "SENT",
            sentAt: "2026-09-01T10:00:00.000Z",
          }),
        ],
      }),
      "me",
    );

    expect(ledgers[0]).toMatchObject({
      pendingAmount: 100,
      remainingAmount: 0,
      openAmount: 100,
      status: "PENDING_CONFIRMATION",
    });
    expect(ledgers[0]?.transactions[0]).toMatchObject({
      progressStatus: "FULL",
      confirmationStatus: "PENDING",
    });
  });

  it("shows incoming payments from the other person's direction", () => {
    const incoming = payment({
      id: "incoming-1",
      amount: 25,
      status: "SETTLED",
      sentAt: "2026-09-01T10:00:00.000Z",
      fromUserId: "friend",
      fromName: "Juehua",
      toUserId: "me",
      toName: "JY",
    });
    const ledgers = buildIndividualPaymentLedgers(
      data({ settledSettlements: [incoming] }),
      "me",
    );

    expect(ledgers[0]).toMatchObject({
      direction: "RECEIVE",
      counterpartyName: "Juehua",
      confirmedAmount: 25,
      status: "SETTLED",
    });
  });

  it("creates a payment-due ledger before any transaction is recorded", () => {
    const ledgers = buildIndividualPaymentLedgers(
      data({
        waitingTransfers: [
          {
            countryId: "country-1",
            countryName: "Vietnam",
            tripId: "trip-1",
            tripName: "Vietnam - Working Trip",
            currency: "MYR",
            fromUserId: "me",
            fromName: "JY",
            toUserId: "friend",
            toName: "Juehua",
            amount: 48.52,
          },
        ],
      }),
      "me",
    );

    expect(ledgers[0]).toMatchObject({
      totalAmount: 48.52,
      remainingAmount: 48.52,
      transactionCount: 0,
      status: "DUE",
    });
  });

  it("does not include other travelers' unrelated payment ledgers", () => {
    const unrelated = payment({
      id: "other-1",
      amount: 10,
      status: "SETTLED",
      sentAt: "2026-09-01T10:00:00.000Z",
      fromUserId: "person-a",
      toUserId: "person-b",
    });

    expect(
      buildIndividualPaymentLedgers(
        data({ settledSettlements: [unrelated] }),
        "me",
      ),
    ).toEqual([]);
  });
});
