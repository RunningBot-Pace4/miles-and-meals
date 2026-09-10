import { FullPageLink as Link } from "@/components/FullPageLink";
import { formatMoney } from "@/lib/money";
import type { SettlementLiveData } from "@/lib/settlement-live";

export function HomeMoneySummary({ data, currentUserId }: { data: SettlementLiveData; currentUserId: string }) {
  const me = data.people.find(person => person.userId === currentUserId);
  return <section className="panel home-money-summary">
    <div className="panel-title"><div><p className="eyebrow">YOUR TRIP MONEY</p><h2>At a glance</h2></div></div>
    <div className="home-money-grid">
      <div><span>Still to pay</span><strong>{formatMoney(me?.toPay ?? 0, data.baseCurrency)}</strong></div>
      <div><span>Still to receive</span><strong>{formatMoney(Math.max(0, (me?.toReceive ?? 0) - (me?.awaitingConfirmation ?? 0)), data.baseCurrency)}</strong></div>
      <div><span>You sent · awaiting confirmation</span><strong>{formatMoney(me?.paymentSent ?? 0, data.baseCurrency)}</strong></div>
      <div><span>Received? Confirm it</span><strong>{formatMoney(me?.awaitingConfirmation ?? 0, data.baseCurrency)}</strong></div>
    </div>
    <p className="muted">Totals include group offsets. Use the panel below to record payment for a specific trip.</p>
    <div className="home-money-actions"><a className="button primary" href="#home-payment">Pay / receive here</a><Link className="button secondary" href="/spend?tab=settlements">Payment history</Link></div>
  </section>;
}
