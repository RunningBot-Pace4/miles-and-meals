import { describe, expect, it } from "vitest";
import {
  canReverseSettlement,
  getReversalStatus,
  isActiveSettlementStatus,
  isTerminalReversalStatus,
} from "@/lib/settlement-status";
import {
  getBillPaymentStatus,
  getBillRemainingAmount,
} from "@/lib/settlement-allocation";

describe("settlement reversal policy", () => {
  it("cancels pending payments and reverses confirmed payments", () => {
    expect(getReversalStatus("SENT")).toBe("CANCELLED");
    expect(getReversalStatus("SETTLED")).toBe("REVERSED");
    expect(getReversalStatus("CANCELLED")).toBeNull();
    expect(getReversalStatus("REVERSED")).toBeNull();
  });

  it("only counts SENT and SETTLED as active money movement", () => {
    expect(isActiveSettlementStatus("SENT")).toBe(true);
    expect(isActiveSettlementStatus("SETTLED")).toBe(true);
    expect(isActiveSettlementStatus("CANCELLED")).toBe(false);
    expect(isActiveSettlementStatus("REVERSED")).toBe(false);
    expect(isTerminalReversalStatus("CANCELLED")).toBe(true);
    expect(isTerminalReversalStatus("REVERSED")).toBe(true);
  });

  it("lets the payer cancel SENT but does not let the payer undo a confirmed receipt", () => {
    const pending = {
      status: "SENT" as const,
      fromUserId: "payer",
      toUserId: "receiver",
    };
    const settled = {
      status: "SETTLED" as const,
      fromUserId: "payer",
      toUserId: "receiver",
    };

    expect(
      canReverseSettlement(pending, "payer", false),
    ).toBe(true);
    expect(
      canReverseSettlement(pending, "receiver", false),
    ).toBe(false);
    expect(
      canReverseSettlement(settled, "payer", false),
    ).toBe(false);
    expect(
      canReverseSettlement(settled, "receiver", false),
    ).toBe(true);
  });

  it("lets a Trip Owner reverse either active state", () => {
    const pending = {
      status: "SENT" as const,
      fromUserId: "payer",
      toUserId: "receiver",
    };
    const settled = {
      status: "SETTLED" as const,
      fromUserId: "payer",
      toUserId: "receiver",
    };

    expect(
      canReverseSettlement(pending, "owner", true),
    ).toBe(true);
    expect(
      canReverseSettlement(settled, "owner", true),
    ).toBe(true);
  });

  it("restores a bill when a reversed allocation is no longer active", () => {
    const originalOwed = 50;
    const activeAllocatedPaid = 20;

    expect(
      getBillRemainingAmount(
        originalOwed,
        activeAllocatedPaid,
      ),
    ).toBe(30);
    expect(
      getBillPaymentStatus(
        originalOwed,
        activeAllocatedPaid,
      ),
    ).toBe("PARTIAL");

    const allocatedPaidAfterReversal = 0;

    expect(
      getBillRemainingAmount(
        originalOwed,
        allocatedPaidAfterReversal,
      ),
    ).toBe(50);
    expect(
      getBillPaymentStatus(
        originalOwed,
        allocatedPaidAfterReversal,
      ),
    ).toBe("UNPAID");
  });
});
