import { describe, expect, it } from "vitest";
import { resolvePaymentConfirmation } from "@/lib/payment-confirmation";
import { calculateDirectOutstandingObligations } from "@/lib/settlement";

const payments = [{ id:"first", fromUserId:"a", toUserId:"b" }, { id:"second", fromUserId:"a", toUserId:"b" }];
describe("separate pending payments", () => {
  it("confirms the selected payment even when it is not the first one", () => {
    expect(resolvePaymentConfirmation(payments, [], "a", "b", "second").pending?.id).toBe("second");
  });
  it("never guesses between two pending payments", () => {
    expect(resolvePaymentConfirmation(payments, [], "a", "b").error).toContain("Choose");
  });
  it("rejects another person's payment and an unknown id", () => {
    expect(resolvePaymentConfirmation(payments, [], "a", "c", "first").error).not.toBe("");
    expect(resolvePaymentConfirmation(payments, [], "a", "b", "missing").error).not.toBe("");
  });
  it("recognizes a confirmation retry without confirming the next pending payment", () => {
    const result = resolvePaymentConfirmation([payments[1]], [payments[0]], "a", "b", "first");
    expect(result.pending).toBeUndefined();
    expect(result.confirmed?.id).toBe("first");
  });
  it("reserves both recorded payments before calculating what can still be paid", () => {
    const result = calculateDirectOutstandingObligations([{fromUserId:"a",fromName:"A",toUserId:"b",toName:"B",amount:50}], [{fromUserId:"a",toUserId:"b",amount:20},{fromUserId:"a",toUserId:"b",amount:10}]);
    expect(result[0].amount).toBe(20);
  });
});
