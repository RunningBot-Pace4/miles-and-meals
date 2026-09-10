import { describe, expect, it } from "vitest";
import { allocateHomePayment } from "@/lib/home-payment-allocation";

const bills = [10, 20, 30, 40].map((remainingAmount, index) => ({ expenseId: String(index + 1), expenseDate: `2026-09-0${index + 1}`, description: `Receipt ${index + 1}`, remainingAmount }));
describe("Home optional receipt allocation", () => {
  it("rejects payments covering more than the server limit of 50 receipts", () => {
    const manyBills = Array.from({ length: 51 }, (_, index) => ({ ...bills[0], expenseId: String(index), remainingAmount: 1 }));
    expect(allocateHomePayment(manyBills, "51").error).toContain("50 receipts");
    expect(allocateHomePayment(manyBills, "50").allocations).toHaveLength(50);
  });
  it("assigns RM20 only to selected receipt 3 and leaves RM10", () => {
    expect(allocateHomePayment(bills, "20", ["3"]).allocations).toEqual([{ expenseId: "3", description: "Receipt 3", amount: 20, remainingAfter: 10 }]);
  });
  it("uses receipts 1 then 2 automatically when none selected", () => {
    expect(allocateHomePayment(bills, "20").allocations.map(row => [row.expenseId, row.amount, row.remainingAfter])).toEqual([["1", 10, 0], ["2", 10, 10]]);
  });
  it("sorts unsorted bills chronologically", () => {
    expect(allocateHomePayment([...bills].reverse(), "35").allocations.map(row => row.expenseId)).toEqual(["1", "2", "3"]);
  });
  it("never spills selected receipts into unselected receipts", () => {
    const result = allocateHomePayment(bills, "31", ["3"]);
    expect(result.error).not.toBe(""); expect(result.allocations).toEqual([]);
  });
  it("rejects a selected receipt outside the given scope", () => {
    expect(allocateHomePayment(bills, "10", ["other-trip"] ).error).not.toBe("");
  });
  it("skips fully covered bills and uses remaining rather than original amounts", () => {
    expect(allocateHomePayment([{ ...bills[0], remainingAmount: 0 }, { ...bills[1], remainingAmount: 5 }], "5").allocations.map(row => row.expenseId)).toEqual(["2"]);
  });
  it("handles cents without floating-point leftovers", () => {
    const result = allocateHomePayment([{ ...bills[0], remainingAmount: 0.1 }, { ...bills[1], remainingAmount: 0.2 }], "0.30");
    expect(result.error).toBe(""); expect(result.allocations.map(row => row.remainingAfter)).toEqual([0, 0]);
  });
  it.each(["0", "-1", "1.001", "NaN", "Infinity", "", "1e3", "101"])("rejects invalid or excessive amount %s", amount => {
    expect(allocateHomePayment(bills, amount).error).not.toBe("");
  });
  it("applies multiple selected receipts in a stable order", () => {
    expect(allocateHomePayment(bills, "25", ["3", "1"]).allocations.map(row => [row.expenseId, row.amount])).toEqual([["1", 10], ["3", 15]]);
  });
});
