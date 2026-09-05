import { describe, expect, it } from "vitest";
import {
  calculateDirectOutstandingObligations,
  calculateSmartSettlementPlan,
  type SettlementTransfer,
} from "../src/lib/settlement";

function transfer(
  fromUserId: string,
  fromName: string,
  toUserId: string,
  toName: string,
  amount: number,
): SettlementTransfer {
  return { fromUserId, fromName, toUserId, toName, amount };
}

describe("Smart Settlement", () => {
  it("nets opposing balances without changing the source obligations", () => {
    const raw = [
      transfer("jy", "JY", "jh", "JH", 50),
      transfer("jh", "JH", "jy", "JY", 60),
      transfer("tan", "Tan", "jy", "JY", 40),
    ];

    const direct = calculateDirectOutstandingObligations(raw, []);
    const smart = calculateSmartSettlementPlan(direct);

    expect(direct).toHaveLength(3);
    expect(smart).toHaveLength(2);
    expect(smart).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fromUserId: "tan",
          toUserId: "jy",
          amount: 40,
        }),
        expect.objectContaining({
          fromUserId: "jh",
          toUserId: "jy",
          amount: 10,
        }),
      ]),
    );
    expect(smart.reduce((sum, row) => sum + row.amount, 0)).toBe(50);
  });

  it("deducts a recorded direct payment from the explainable source ledger", () => {
    const raw = [transfer("jy", "JY", "jh", "JH", 50)];
    const direct = calculateDirectOutstandingObligations(raw, [
      { fromUserId: "jy", toUserId: "jh", amount: 20 },
    ]);

    expect(direct).toEqual([
      expect.objectContaining({
        fromUserId: "jy",
        toUserId: "jh",
        amount: 30,
      }),
    ]);
  });
});
