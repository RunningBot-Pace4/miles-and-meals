import type { SmartSettlementExpenseLine, SmartSettlementPaymentLine } from "@/lib/settlement-ledger";

export function billPaymentProgress(bill: SmartSettlementExpenseLine, payments: SmartSettlementPaymentLine[]) {
  let confirmed = 0;
  let pending = 0;
  for (const payment of payments) {
    if (payment.fromUserId !== bill.participantUserId || payment.toUserId !== bill.payerUserId) continue;
    const amount = payment.allocations.filter(a => a.expenseId === bill.expenseId).reduce((sum, a) => sum + a.amount, 0);
    if (payment.status === "SETTLED") confirmed += amount;
    if (payment.status === "SENT") pending += amount;
  }
  const round = (n: number) => Math.round(n * 100) / 100;
  confirmed = round(confirmed);
  pending = round(pending);
  const stillToPay = round(Math.max(0, bill.shareAmount - confirmed - pending));
  const status = pending > 0 ? "Awaiting confirmation" : confirmed >= bill.shareAmount - 0.009 ? "Settled" : confirmed > 0 ? "Partial" : "Unpaid";
  return { confirmed, pending, stillToPay, status };
}
