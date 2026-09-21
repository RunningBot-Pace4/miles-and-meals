type Payment = { id: string; currency: string; amount: number; status: string; fromUserId: string; toUserId: string };
/** Pending money is reserved, never counted as confirmed. Keep currencies separate. */
export function paymentStatusSummary(payments: Payment[], userId: string) {
  const totals = new Map<string, { currency: string; sent: number; awaitingReceipt: number; received: number; paid: number }>();
  const seen = new Set<string>();
  for (const payment of payments) {
    if (seen.has(payment.id) || !["SENT", "SETTLED"].includes(payment.status) || ![payment.fromUserId, payment.toUserId].includes(userId)) continue;
    seen.add(payment.id);
    const row = totals.get(payment.currency) ?? { currency: payment.currency, sent: 0, awaitingReceipt: 0, received: 0, paid: 0 };
    const field = payment.status === "SENT" ? payment.fromUserId === userId ? "sent" : "awaitingReceipt" : payment.fromUserId === userId ? "paid" : "received";
    row[field] += Math.round(payment.amount * 100);
    totals.set(payment.currency, row);
  }
  return [...totals.values()].map(row => ({ ...row, sent: row.sent / 100, awaitingReceipt: row.awaitingReceipt / 100, received: row.received / 100, paid: row.paid / 100 }));
}
