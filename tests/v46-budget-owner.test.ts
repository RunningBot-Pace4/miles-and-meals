import {
  describe,
  expect,
  it,
} from "vitest";
import {
  calculateBudgetWallet,
  sumPersonalBudgets,
} from "@/lib/budget-math";
import {
  isTripOwnerRole,
} from "@/lib/trip-roles";

describe("v46 personal and group budgets", () => {
  it("sums individual traveler budgets into the combined budget", () => {
    expect(
      sumPersonalBudgets([
        {
          userId: "jy",
          amount: 5000,
        },
        {
          userId: "test",
          amount: 3500,
        },
        {
          userId: "huahua",
          amount: 4000,
        },
      ]),
    ).toBe(12500);
  });

  it("keeps personal and group remaining amounts separate", () => {
    expect(
      calculateBudgetWallet(
        5000,
        1280,
        12500,
        4600,
      ),
    ).toEqual({
      myRemaining: 3720,
      groupRemaining: 7900,
    });
  });
});

describe("v46 trip owner roles", () => {
  it("accepts OWNER and legacy ADMIN trip memberships as manager roles", () => {
    expect(
      isTripOwnerRole(
        "OWNER",
      ),
    ).toBe(true);
    expect(
      isTripOwnerRole(
        "ADMIN",
      ),
    ).toBe(true);
    expect(
      isTripOwnerRole(
        "MEMBER",
      ),
    ).toBe(false);
  });
});
