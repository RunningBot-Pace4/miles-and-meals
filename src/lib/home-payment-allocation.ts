export type AllocatableBill = { expenseId: string; expenseDate: string; description: string; remainingAmount: number };

export function allocateHomePayment(bills: AllocatableBill[], amountText: string, selectedIds: string[] = []) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(amountText.trim())) return { error: "Enter an amount with up to two decimal places.", allocations: [] };
  let remaining = Math.round(Number(amountText) * 100);
  if (!Number.isSafeInteger(remaining) || remaining <= 0) return { error: "Enter an amount greater than zero.", allocations: [] };
  if (selectedIds.some(id => !bills.some(bill => bill.expenseId === id))) return { error: "A selected receipt is no longer available. Please select again.", allocations: [] };
  const eligible = bills.filter(bill => bill.remainingAmount > 0.009 && (!selectedIds.length || selectedIds.includes(bill.expenseId)))
    .slice().sort((a, b) => a.expenseDate.localeCompare(b.expenseDate) || a.expenseId.localeCompare(b.expenseId));
  const allocations: Array<{ expenseId: string; description: string; amount: number; remainingAfter: number }> = [];
  for (const bill of eligible) {
    if (!remaining) break;
    const outstanding = Math.round(bill.remainingAmount * 100);
    const used = Math.min(remaining, outstanding);
    allocations.push({ expenseId: bill.expenseId, description: bill.description, amount: used / 100, remainingAfter: (outstanding - used) / 100 });
    remaining -= used;
  }
  if (allocations.length > 50) return { error: "One payment can cover up to 50 receipts. Choose fewer receipts or reduce the amount.", allocations: [] };
  return remaining ? { error: "Amount exceeds the outstanding balance of these receipts.", allocations: [] } : { error: "", allocations };
}
