import {
  describe,
  expect,
  it,
} from "vitest";
import {
  calculateOutstandingSettlements,
  calculateSettlements,
} from "@/lib/settlement";

const JY = {
  userId: "jy",
  name: "JY",
};

const TEST = {
  userId: "test",
  name: "Test",
};

const HUAHUA = {
  userId: "huahua",
  name: "Huahua",
};

describe("settlement calculation", () => {
  it("splits a payer credit across the people who owe", () => {
    const result = calculateSettlements([
      {
        ...JY,
        paid: 90,
        owed: 0,
      },
      {
        ...TEST,
        paid: 0,
        owed: 45,
      },
      {
        ...HUAHUA,
        paid: 0,
        owed: 45,
      },
    ]);

    expect(result).toEqual([
      {
        fromUserId: "test",
        fromName: "Test",
        toUserId: "jy",
        toName: "JY",
        amount: 45,
      },
      {
        fromUserId: "huahua",
        fromName: "Huahua",
        toUserId: "jy",
        toName: "JY",
        amount: 45,
      },
    ]);
  });

  it("keeps payment history intuitive after an expense split is edited", () => {
    const result =
      calculateOutstandingSettlements(
        [
          {
            ...JY,
            paid: 90,
            owed: 0,
          },
          {
            ...TEST,
            paid: 0,
            owed: 90,
          },
          {
            ...HUAHUA,
            paid: 0,
            owed: 0,
          },
        ],
        [
          {
            fromUserId: "huahua",
            toUserId: "jy",
            amount: 45,
          },
        ],
      );

    expect(result).toEqual(
      expect.arrayContaining([
        {
          fromUserId: "test",
          fromName: "Test",
          toUserId: "jy",
          toName: "JY",
          amount: 90,
        },
        {
          fromUserId: "jy",
          fromName: "JY",
          toUserId: "huahua",
          toName: "Huahua",
          amount: 45,
        },
      ]),
    );
    expect(result).toHaveLength(2);
  });

  it("removes a matching payment from the remaining amount", () => {
    const result =
      calculateOutstandingSettlements(
        [
          {
            ...JY,
            paid: 90,
            owed: 0,
          },
          {
            ...TEST,
            paid: 0,
            owed: 90,
          },
        ],
        [
          {
            fromUserId: "test",
            toUserId: "jy",
            amount: 40,
          },
        ],
      );

    expect(result).toEqual([
      {
        fromUserId: "test",
        fromName: "Test",
        toUserId: "jy",
        toName: "JY",
        amount: 50,
      },
    ]);
  });

  it("creates a direct refund when somebody overpaid", () => {
    const result =
      calculateOutstandingSettlements(
        [
          {
            ...JY,
            paid: 45,
            owed: 0,
          },
          {
            ...HUAHUA,
            paid: 0,
            owed: 45,
          },
        ],
        [
          {
            fromUserId: "huahua",
            toUserId: "jy",
            amount: 60,
          },
        ],
      );

    expect(result).toEqual([
      {
        fromUserId: "jy",
        fromName: "JY",
        toUserId: "huahua",
        toName: "Huahua",
        amount: 15,
      },
    ]);
  });
});
