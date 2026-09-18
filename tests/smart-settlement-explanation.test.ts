import { describe, expect, it } from "vitest";
import { simpleSettlementRedirects } from "@/lib/smart-settlement-explanation";
import type { SmartSettlementPlan, SmartSettlementOriginalBalance, CountrySettlementTransfer } from "@/lib/settlement-ledger";

const debt = (from: string, to: string, amount: number): SmartSettlementOriginalBalance => ({fromUserId: from, fromName: from, toUserId: to, toName: to, amount, directPaid: 0, allocatedPaid: 0, unallocatedDirectPaid: 0, directRemaining: amount, billRemaining: amount, expenseCount: 1, expenses: []});
const transfer = (from: string, amount: number): CountrySettlementTransfer => ({fromUserId: from, fromName: from, toUserId: "JY", toName: "JY", amount, countryId: "c", countryName: "Malaysia", tripId: "t", tripName: "Kota", currency: "MYR"});
function fixture(): SmartSettlementPlan {
  return {countryId: "c", countryName: "Malaysia", tripId: "t", tripName: "Kota", currency: "MYR", originalTransfers: [], optimizedTransfers: [transfer("Parent", 25.06), transfer("Juehua", 113.57)], originalTransferCount: 3, optimizedTransferCount: 2, transfersSaved: 1, totalOutstanding: 138.63, optimizationMode: "EXACT", originalExpenseBalances: [debt("Parent", "JY", 50.06), debt("Juehua", "Parent", 25), debt("Juehua", "JY", 88.57)], recordedPayments: [], netPositions: []};
}
describe("smart settlement explanation", () => {
  it("explains the screenshot's 25 offset without changing the plan", () => {
    const plan = fixture();
    expect(simpleSettlementRedirects(plan, transfer("Parent", 25.06))).toEqual([{fromName: "Juehua", amount: 25}]);
    expect(plan.optimizedTransfers.map(t => t.amount)).toEqual([25.06, 113.57]);
  });
  it("never offsets Parent when Juehua owes JY directly", () => {
    const plan = fixture(); plan.originalExpenseBalances[1] = debt("Juehua", "JY", 25);
    expect(simpleSettlementRedirects(plan, transfer("Parent", 25.06))).toEqual([]);
  });
  it("does not invent a redirection when payments have already changed balances", () => {
    const plan = fixture(); plan.netPositions = [{userId: "Parent", name: "Parent", grossOwes: 50.06, grossReceives: 25, recordedSent: 1, recordedReceived: 0, remainingNet: -24.06}];
    expect(simpleSettlementRedirects(plan, transfer("Parent", 25.06))).toEqual([]);
  });
  it("falls back to the full ledger for a complex group", () => {
    const plan = fixture(); plan.originalExpenseBalances.push(debt("Juehua", "Other", 10));
    expect(simpleSettlementRedirects(plan, transfer("Parent", 25.06))).toEqual([]);
  });
});
