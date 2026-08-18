import { describe, expect, it } from "vitest";
import {
  calculateOutstandingSettlements,
  calculateSettlements,
} from "@/lib/settlement";

describe("calculateSettlements", () => {
  it("creates one transfer for a two-person trip", () => {
    const result = calculateSettlements([
      { userId: "a", name: "Jian", paid: 600, owed: 400 },
      { userId: "b", name: "JueHua", paid: 200, owed: 400 },
    ]);

    expect(result).toEqual([
      {
        fromUserId: "b",
        fromName: "JueHua",
        toUserId: "a",
        toName: "Jian",
        amount: 200,
      },
    ]);
  });

  it("returns no transfers when everyone is settled", () => {
    expect(
      calculateSettlements([
        { userId: "a", name: "A", paid: 100, owed: 100 },
        { userId: "b", name: "B", paid: 50, owed: 50 },
      ]),
    ).toEqual([]);
  });

  it("splits a payer reimbursement between two travelers", () => {
    const result = calculateSettlements([
      { userId: "jy", name: "JY", paid: 150, owed: 50 },
      { userId: "jh", name: "JH", paid: 0, owed: 50 },
      { userId: "jj", name: "JJ", paid: 0, owed: 50 },
    ]);

    expect(result).toEqual([
      {
        fromUserId: "jh",
        fromName: "JH",
        toUserId: "jy",
        toName: "JY",
        amount: 50,
      },
      {
        fromUserId: "jj",
        fromName: "JJ",
        toUserId: "jy",
        toName: "JY",
        amount: 50,
      },
    ]);
  });

  it("removes a payment marked sent from the remaining recommendations", () => {
    const result = calculateOutstandingSettlements(
      [
        { userId: "jy", name: "JY", paid: 150, owed: 50 },
        { userId: "jh", name: "JH", paid: 0, owed: 50 },
        { userId: "jj", name: "JJ", paid: 0, owed: 50 },
      ],
      [
        {
          fromUserId: "jh",
          toUserId: "jy",
          amount: 50,
        },
      ],
    );

    expect(result).toEqual([
      {
        fromUserId: "jj",
        fromName: "JJ",
        toUserId: "jy",
        toName: "JY",
        amount: 50,
      },
    ]);
  });
});
