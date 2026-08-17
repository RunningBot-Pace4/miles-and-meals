import { describe, expect, it } from "vitest";
import { calculateSettlements } from "@/lib/settlement";

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
});
