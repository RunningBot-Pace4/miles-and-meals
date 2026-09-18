import type { CountrySettlementTransfer, SmartSettlementPlan } from "./settlement-ledger";

// Only describe an individual redirection when the original graph proves it.
// Complex graphs and recorded payments are explained through the full ledger.
export function simpleSettlementRedirects(plan: SmartSettlementPlan, transfer: CountrySettlementTransfer) {
  if (plan.netPositions.some(p => p.recordedSent > 0 || p.recordedReceived > 0)) return [];
  const payer = transfer.fromUserId;
  const receiver = transfer.toUserId;
  const balances = plan.originalExpenseBalances.filter(b => b.amount > 0);
  const outgoing = balances.filter(b => b.fromUserId === payer);
  const incoming = balances.filter(b => b.toUserId === payer);
  if (outgoing.length !== 1 || outgoing[0].toUserId !== receiver || !incoming.length) return [];
  if (balances.some(b => b.fromUserId === receiver || (b.toUserId !== payer && b.toUserId !== receiver))) return [];
  if (plan.optimizedTransfers.some(t => t.toUserId !== receiver)) return [];
  const cents = (n: number) => Math.round(n * 100);
  const offset = incoming.reduce((sum, b) => sum + cents(b.amount), 0);
  if (cents(outgoing[0].amount) - offset !== cents(transfer.amount)) return [];
  if (incoming.some(b => !plan.optimizedTransfers.some(t => t.fromUserId === b.fromUserId && t.toUserId === receiver && cents(t.amount) >= cents(b.amount)))) return [];
  return incoming.map(b => ({ fromName: b.fromName, amount: b.amount }));
}
