import { describe, expect, it } from "vitest";
import { billPaymentProgress } from "@/lib/bill-payment-progress";
import type { SmartSettlementExpenseLine, SmartSettlementPaymentLine } from "@/lib/settlement-ledger";

const bill = { expenseId: "breakfast", participantUserId: "a", payerUserId: "b", shareAmount: 50 } as SmartSettlementExpenseLine;
const payment = (status: SmartSettlementPaymentLine["status"], amount: number, expenseId = "breakfast") => ({ fromUserId: "a", toUserId: "b", status, allocations: [{ expenseId, amount }] }) as SmartSettlementPaymentLine;
describe("bill payment progress", () => {
  it("shows RM20 confirmed against RM50 as partial with RM30 left", () => {
    expect(billPaymentProgress(bill, [payment("SETTLED", 20)])).toEqual({ confirmed: 20, pending: 0, stillToPay: 30, status: "Partial" });
  });
  it("reserves pending transfers without claiming receipt", () => {
    expect(billPaymentProgress(bill, [payment("SETTLED", 20), payment("SENT", 30)])).toEqual({ confirmed: 20, pending: 30, stillToPay: 0, status: "Awaiting confirmation" });
  });
  it("settles only after receipt confirmation", () => {
    expect(billPaymentProgress(bill, [payment("SETTLED", 50)]).status).toBe("Settled");
  });
  it("ignores other bills, other people and reversed or cancelled transfers", () => {
    expect(billPaymentProgress(bill, [payment("SETTLED", 20, "hotel"), payment("REVERSED", 20), payment("CANCELLED", 20), { ...payment("SETTLED", 20), fromUserId: "c" }])).toEqual({ confirmed: 0, pending: 0, stillToPay: 50, status: "Unpaid" });
  });
  it("does not assign general payments to arbitrary bills", () => {
    expect(billPaymentProgress(bill, [{ ...payment("SETTLED", 50), allocations: [] }]).stillToPay).toBe(50);
  });
});
