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

export function HomePaymentRequestCard({ choices, currentUserId, onRecord }: { choices: PaymentChoice[]; currentUserId: string; onRecord: (message: string) => void }) {
  const [choiceKey, setChoiceKey] = useState(`${choices[0].plan.tripId}:${choices[0].plan.countryId}`);
  const choice = choices.find(({ plan }) => `${plan.tripId}:${plan.countryId}` === choiceKey) ?? choices[0];
  const { plan, balance } = choice;
  const paying = balance.fromUserId === currentUserId;
  const maximum = balance.directRemaining;
  const [amount, setAmount] = useState(maximum.toFixed(2));
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
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
    onRecord(`${plan.tripName} · ${formatMoney(numericAmount, plan.currency)} ${paying ? "sent · awaiting confirmation" : "received · confirmed"}. ${preview.allocations.map(item => `${item.description}: ${formatMoney(item.amount, plan.currency)} applied, ${formatMoney(item.remainingAfter, plan.currency)} remaining${paying ? " after confirmation" : ""}`).join("; ")}.`);
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
      {valid ? <SettlementActionButton key={`${choiceKey}:${maximum}`} action={paying ? "MARK_PAID" : "MARK_RECEIVED"} allocations={preview.allocations.map((item) => ({ expenseId: item.expenseId, amount: item.amount }))} countryId={plan.countryId} counterpartyUserId={paying ? balance.toUserId : balance.fromUserId} currency={plan.currency} detailsContent={detailContent} fixedAmount label={paying ? "Confirm payment sent" : "Mark received"} maximumAmount={numericAmount} onBusyChange={setBusy} onRecorded={recorded} /> : <div className="settlement-action-wrap"><details className="settlement-payment-details"><summary>Payment details · optional</summary><div className="settlement-payment-details-grid">{detailContent}</div></details><button className="button settlement-action-button" disabled type="button">Check amount or selected bills</button></div>}
    </div>
  </article>;
}

export function HomePaymentPanel({ data, currentUserId }: { data: SettlementLiveData; currentUserId: string }) {
  const [lastPayment, setLastPayment] = useState("");
  const pending = data.pendingSettlements.filter((payment) => payment.fromUserId === currentUserId || payment.toUserId === currentUserId);
  const requests = data.smartPlans.flatMap((plan) => plan.originalExpenseBalances
    .filter((balance) => balance.directRemaining > 0.009 && (balance.fromUserId === currentUserId || balance.toUserId === currentUserId))
    .map((balance) => ({ plan, balance })));
  const requestGroups = Array.from(requests.reduce((groups, request) => {
    const key = `${request.balance.fromUserId}:${request.balance.toUserId}`;
    groups.set(key, [...(groups.get(key) ?? []), request]);
    return groups;
  }, new Map<string, PaymentChoice[]>()).entries());

  return <section className="panel settlement-panel home-payment-panel" id="home-payment">
    <div className="panel-title"><div><p className="eyebrow">PAYMENT REQUESTS</p><h2>Payments to send or confirm</h2><p className="muted">The person and trip are already matched. Open payment details only when you want to choose specific receipts.</p></div><Link className="button secondary" href="/spend?tab=settlements#payment-history">Payment history</Link></div>
    {lastPayment ? <p className="bill-payment-saved" role="status">✓ {lastPayment}</p> : null}
    <div className="settlement-status-list">
      {pending.map((payment) => <article className="settlement-status-row sent" key={payment.id}>
        <div className="settlement-status-icon">↗</div>
        <div className="settlement-status-copy"><strong>{payment.fromUserId === currentUserId ? `You → ${payment.toName}` : `${payment.fromName} → You`}</strong><span className="settlement-state-pill sent">Sent · awaiting receipt</span><small>{payment.tripName}</small>{payment.allocations.length ? <small>Bills: {payment.allocations.map((item) => `${item.description} ${formatMoney(item.amount, payment.currency)}`).join(" · ")}</small> : null}</div>
        <strong className="settlement-amount">{formatMoney(payment.amount, payment.currency)}</strong>
        {payment.toUserId === currentUserId ? <SettlementActionButton action="MARK_RECEIVED" settlementId={payment.id} countryId={payment.countryId} counterpartyUserId={payment.fromUserId} label="Confirm received" onRecorded={() => setLastPayment(`${payment.tripName} · ${formatMoney(payment.amount, payment.currency)} received · confirmed.`)} /> : <div className="home-payment-awaiting">Waiting for confirmation</div>}
      </article>)}
      {requestGroups.map(([key, choices]) => <HomePaymentRequestCard onRecord={setLastPayment} choices={choices} currentUserId={currentUserId} key={key} />)}
      {!pending.length && !requests.length ? <div className="settled-state"><span aria-hidden="true">✓</span><div><strong>Nothing outstanding</strong><small>You are settled for the selected trip.</small></div></div> : null}
    </div>
  </section>;
}
