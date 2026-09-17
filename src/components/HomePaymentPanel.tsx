"use client";

import { useEffect, useRef, useState } from "react";
import { FullPageLink as Link } from "@/components/FullPageLink";
import { SettlementActionButton } from "@/components/SettlementActionButton";
import { HomePaymentAmount } from "@/components/HomePaymentAmount";
import { allocateHomePayment } from "@/lib/home-payment-allocation";
import { formatMoney } from "@/lib/money";
import type { SettlementLiveData } from "@/lib/settlement-live";

type SmartPlan = SettlementLiveData["smartPlans"][number];
type DirectBalance = SmartPlan["originalExpenseBalances"][number];
type PaymentChoice = { plan: SmartPlan; balance: DirectBalance };

export function HomePaymentRequestCard({ choices, currentUserId }: { choices: PaymentChoice[]; currentUserId: string }) {
  const [choiceKey, setChoiceKey] = useState(`${choices[0].plan.tripId}:${choices[0].plan.countryId}`);
  const choice = choices.find(({ plan }) => `${plan.tripId}:${plan.countryId}` === choiceKey) ?? choices[0];
  const { plan, balance } = choice;
  const paying = balance.fromUserId === currentUserId;
  const maximum = balance.directRemaining;
  const [amount, setAmount] = useState(maximum.toFixed(2));
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const previousMaximum = useRef(maximum);
  const resetAfterPayment = useRef(false);
  const bills = balance.expenses.filter((bill) => bill.remainingAmount > 0.009);
  const billSignature = bills.map((bill) => `${bill.expenseId}:${bill.remainingAmount}`).join("|");
  const preview = allocateHomePayment(bills, amount, selected);
  const numericAmount = Number(amount);
  const exceedsBalance = numericAmount > maximum + 0.009;
  const valid = !preview.error && !exceedsBalance && numericAmount > 0;

  useEffect(() => {
    setSelected((ids) => ids.filter((id) => bills.some((bill) => bill.expenseId === id)));
    const shouldReset = resetAfterPayment.current;
    const oldMaximum = previousMaximum.current;
    setAmount((current) => shouldReset || current === "" || Number(current) > maximum + 0.009 || Math.abs(Number(current) - oldMaximum) < 0.005 ? maximum.toFixed(2) : current);
    resetAfterPayment.current = false;
    previousMaximum.current = maximum;
    // billSignature represents the stable receipt IDs and balances, avoiding an effect on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maximum, billSignature, plan.countryId]);

  function recorded() {
    setSelected([]);
    // This callback runs only after a successful save. Show the remainder now;
    // the next ledger update supplies the authoritative remaining balance.
    resetAfterPayment.current = true;
    setAmount(Math.max(0, maximum - numericAmount).toFixed(2));
  }

  const detailContent = <>
    <label className="home-payment-trip-detail"><span>Trip · required</span><select disabled={busy} value={choiceKey} onChange={(event) => {
      const next = choices.find(({ plan: item }) => `${item.tripId}:${item.countryId}` === event.target.value) ?? choices[0];
      setChoiceKey(event.target.value);
      setAmount(next.balance.directRemaining.toFixed(2));
      setSelected([]);
    }}>{choices.map(({ plan: item, balance: itemBalance }) => <option key={`${item.tripId}:${item.countryId}`} value={`${item.tripId}:${item.countryId}`}>{item.tripName} · {formatMoney(itemBalance.directRemaining, item.currency)}</option>)}</select></label>
    <div className="home-payment-bill-picker">
      <strong>Bill / receipt · optional</strong>
      <small>Select receipt(s), or leave all unchecked to apply the payment to the oldest unpaid bill first.</small>
      <div className="home-payment-bill-list">
        {bills.map((bill) => <label className="home-receipt-option" key={bill.expenseId}>
          <input disabled={busy} checked={selected.includes(bill.expenseId)} onChange={(event) => setSelected((ids) => event.target.checked ? [...ids, bill.expenseId] : ids.filter((id) => id !== bill.expenseId))} type="checkbox" />
          <span>{bill.description}<small>{bill.expenseDate} · {formatMoney(bill.remainingAmount, plan.currency)} remaining</small></span>
        </label>)}
      </div>
      {valid ? <div className="home-allocation-preview">
        <strong>{selected.length ? "Selected receipt allocation" : "Automatic allocation"}</strong>
        {preview.allocations.map((item) => <span key={item.expenseId}>{item.description}: {formatMoney(item.amount, plan.currency)} · {formatMoney(item.remainingAfter, plan.currency)} remains</span>)}
      </div> : null}
    </div>
  </>;

  return <article className="settlement-status-row waiting home-payment-request">
    <div className="settlement-status-icon">○</div>
    <div className="settlement-status-copy"><strong>{paying ? `You → ${balance.toName}` : `${balance.fromName} → You`}</strong><span className="settlement-state-pill waiting">Payment due</span><small>{plan.tripName}</small></div>
    <strong className="settlement-amount">{formatMoney(maximum, plan.currency)}</strong>
    <div className="home-payment-request-action">
      <HomePaymentAmount amount={amount} currency={plan.currency} paying={paying} maximum={maximum} busy={busy} onChange={setAmount}
        selectedMaximum={selected.length ? bills.filter(bill => selected.includes(bill.expenseId)).reduce((sum, bill) => sum + bill.remainingAmount, 0) : undefined}
        remaining={valid ? Math.max(0, maximum - numericAmount) : null}
        error={amount ? exceedsBalance ? `Cannot exceed ${formatMoney(maximum, plan.currency)}.` : preview.error ?? "" : ""} />
      {<SettlementActionButton key={`${choiceKey}:${maximum}`} detailsOpen={detailsOpen} onDetailsToggle={setDetailsOpen} action={paying ? "MARK_PAID" : "MARK_RECEIVED"} allocations={preview.allocations.map((item) => ({ expenseId: item.expenseId, amount: item.amount }))} countryId={plan.countryId} counterpartyUserId={paying ? balance.toUserId : balance.fromUserId} currency={plan.currency} detailsContent={detailContent} disabled={!valid} fixedAmount label={!valid ? "Check amount or selected bills" : paying ? "Confirm payment sent" : "Mark received"} maximumAmount={numericAmount} onBusyChange={setBusy} onRecorded={recorded} />}
    </div>
  </article>;
}

export function HomePaymentPanel({ data, currentUserId }: { data: SettlementLiveData; currentUserId: string }) {
  const pending = data.pendingSettlements.filter((payment) => payment.fromUserId === currentUserId || payment.toUserId === currentUserId);
  const requests = data.smartPlans.flatMap((plan) => plan.originalExpenseBalances
    .filter((balance) => balance.directRemaining > 0.009 && (balance.fromUserId === currentUserId || balance.toUserId === currentUserId))
    .map((balance) => ({ plan, balance })));
  const requestGroups = Array.from(requests.reduce((groups, request) => {
    const key = `${request.balance.fromUserId}:${request.balance.toUserId}`;
    groups.set(key, [...(groups.get(key) ?? []), request]);
    return groups;
  }, new Map<string, PaymentChoice[]>()).entries());
  const paymentTripIds = [...new Set([...requests.map(({ plan }) => plan.tripId), ...pending.map((payment) => payment.tripId)])];
  const historyTripId = paymentTripIds.length === 1 ? paymentTripIds[0] : data.smartPlans.length === 1 ? data.smartPlans[0].tripId : undefined;
  const historyHref = `/spend?tab=settlements${historyTripId ? `&tripId=${encodeURIComponent(historyTripId)}` : ""}#payment-history`;

  return <section className="panel settlement-panel home-payment-panel" id="home-payment">
    <div className="panel-title"><div><p className="eyebrow">PAYMENT REQUESTS</p><h2>Payments to send or confirm</h2><p className="muted">Send a payment or confirm money received, right here.</p></div><Link className="button secondary" href={historyHref}>Payment history</Link></div>
    <div className="settlement-status-list">
      {pending.map((payment) => <article className="home-pending-payment" key={payment.id}>
        <header className="home-pending-heading">
          <span className="home-pending-avatar" aria-hidden="true">↗</span>
          <div><strong>{payment.fromUserId === currentUserId ? `You → ${payment.toName}` : `${payment.fromName} → You`}</strong><small>{payment.tripName}</small></div>
        </header>
        <div className="home-pending-total"><div><span>{payment.toUserId === currentUserId ? "To confirm received" : "Payment sent"}</span><strong>{formatMoney(payment.amount, payment.currency)}</strong></div><span className="home-pending-status">Awaiting confirmation</span></div>
        {payment.allocations.length ? <section className="home-pending-receipts" aria-label="Receipt breakdown">
          <div className="home-pending-receipts-heading"><span>Applied to receipts</span><small>{payment.allocations.length} {payment.allocations.length === 1 ? "receipt" : "receipts"}</small></div>
          <ul>{payment.allocations.map((item, index) => <li key={`${item.expenseId}:${index}`}><span className="home-pending-receipt-number" aria-hidden="true">{index + 1}</span><span className="home-pending-receipt-name">{item.description}</span><strong>{formatMoney(item.amount, payment.currency)}</strong></li>)}</ul>
        </section> : null}
        <footer className="home-pending-footer">{payment.toUserId === currentUserId ? <SettlementActionButton action="MARK_RECEIVED" settlementId={payment.id} countryId={payment.countryId} counterpartyUserId={payment.fromUserId} label="Confirm received" /> : <div className="home-pending-waiting">Waiting for confirmation</div>}</footer>
      </article>)}
      {requestGroups.map(([key, choices]) => <HomePaymentRequestCard choices={choices} currentUserId={currentUserId} key={key} />)}
      {!pending.length && !requests.length ? <div className="settled-state"><span aria-hidden="true">✓</span><div><strong>Nothing outstanding</strong><small>You are settled for the selected trip.</small></div></div> : null}
    </div>
  </section>;
}
