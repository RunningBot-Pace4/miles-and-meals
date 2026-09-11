type Payment = { id: string; fromUserId: string; toUserId: string };

/** Lists must already be scoped to the authorized country ledger. */
export function resolvePaymentConfirmation<T extends Payment>(pending: T[], settled: T[], fromUserId: string, toUserId: string, settlementId?: string) {
  const matches = pending.filter(row => row.fromUserId === fromUserId && row.toUserId === toUserId);
  if (!settlementId && matches.length > 1) return { error: "Choose the individual payment to confirm.", pending: undefined, confirmed: undefined };
  const selected = matches.find(row => !settlementId || row.id === settlementId);
  const confirmed = settlementId ? settled.find(row => row.id === settlementId && row.fromUserId === fromUserId && row.toUserId === toUserId) : undefined;
  return { pending: selected, confirmed, error: settlementId && !selected && !confirmed ? "This payment is no longer available to confirm. Refresh the page." : "" };
}
