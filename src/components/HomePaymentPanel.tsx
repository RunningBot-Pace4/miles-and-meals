"use client";

import { useEffect, useRef, useState } from "react";
import { SettlementActionButton } from "@/components/SettlementActionButton";
import { allocateHomePayment } from "@/lib/home-payment-allocation";
import { formatMoney } from "@/lib/money";
import type { SettlementLiveData } from "@/lib/settlement-live";

export type PaymentTrip = { id: string; name: string; financialStatus: string };

export function HomePaymentPanel({ trips, currentUserId }: { trips: PaymentTrip[]; currentUserId: string }) {
  const [tripId, setTripId] = useState("");
  const [direction, setDirection] = useState("pay");
  const [pairKey, setPairKey] = useState("");
  const [amount, setAmount] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [data, setData] = useState<SettlementLiveData | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const requestRef = useRef(0);

  useEffect(() => {
    if (!tripId) return;
    const refresh = () => {
      if (!submitting && !loading && !amount && !selected.length && navigator.onLine && document.visibilityState === "visible") setRevision(value => value + 1);
    };
    const timer = window.setInterval(refresh, 15_000);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); window.removeEventListener("online", refresh); };
  }, [tripId, submitting, loading, amount, selected.length]);

  useEffect(() => {
    const requestId = ++requestRef.current;
    setData(null); setError("");
    if (!tripId) { setLoading(false); return; }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    setLoading(true);
    void fetch(`/api/settlements/summary?trip=${encodeURIComponent(tripId)}`, { cache: "no-store", signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error("Unable to load this trip's balances. Please retry."); return response.json() as Promise<SettlementLiveData>; })
      .then(next => { if (requestId === requestRef.current) setData(next); })
      .catch(() => { if (requestId === requestRef.current && !controller.signal.aborted) setError("Unable to load balances. Please retry."); else if (requestId === requestRef.current) setError("Balance request timed out. Please retry."); })
      .finally(() => { clearTimeout(timer); if (requestId === requestRef.current) setLoading(false); });
    return () => { ++requestRef.current; controller.abort(); clearTimeout(timer); };
  }, [tripId, revision]);

  const relationships = (data?.smartPlans ?? []).filter(plan => plan.tripId === tripId).flatMap(plan => plan.originalExpenseBalances
    .filter(balance => direction === "pay" ? balance.fromUserId === currentUserId : balance.toUserId === currentUserId)
    .map(balance => ({ plan, balance, key: `${plan.countryId}:${balance.fromUserId}:${balance.toUserId}` })));
  const relationship = relationships.find(item => item.key === pairKey);
  const balance = relationship?.balance;
  const plan = relationship?.plan;
  const pending = plan?.recordedPayments.find(payment => payment.status === "SENT" && payment.fromUserId === balance?.fromUserId && payment.toUserId === balance?.toUserId);
  const bills = balance?.expenses.filter(bill => bill.remainingAmount > 0.009) ?? [];
  const preview = allocateHomePayment(bills, amount, selected);
  const exceedsDirect = Number(amount) > (balance?.directRemaining ?? 0) + 0.009;
  const closed = trips.find(trip => trip.id === tripId)?.financialStatus === "CLOSED";
  const valid = Boolean(plan && balance && !pending && !closed && !preview.error && !exceedsDirect && !loading && !error);
  function resetSelection() { setPairKey(""); setAmount(""); setSelected([]); setNotice(""); }
  function recorded() {
    setNotice(direction === "pay" ? "Payment saved. Allocated amounts are reserved until the receiver confirms." : "Receipt confirmed and bill balances updated.");
    setAmount(""); setSelected([]); setSubmitting(false); setRevision(value => value + 1);
  }

  return <section className="panel home-payment-panel stack gap-lg" id="home-payment">
    <div><p className="eyebrow">PAY OR RECEIVE</p><h2>Settle a bill, right here</h2></div>
    {notice && <p role="status">{notice}</p>}
    <fieldset disabled={submitting} className="stack">
      <label>Trip · required<select value={tripId} onChange={event => { setTripId(event.target.value); resetSelection(); }}><option value="">Choose a trip</option>{trips.map(trip => <option value={trip.id} key={trip.id} disabled={trip.financialStatus === "CLOSED"}>{trip.name}{trip.financialStatus === "CLOSED" ? " · closed" : ""}</option>)}</select></label>
      {tripId && <label>I want to<select value={direction} onChange={event => { setDirection(event.target.value); resetSelection(); }}><option value="pay">Record a payment I sent</option><option value="receive">Record money I received</option></select></label>}
      {loading && <p role="status">Loading this trip's bills…</p>}
      {error && <p role="alert">{error} <button type="button" onClick={() => setRevision(value => value + 1)}>Retry</button></p>}
      {data && tripId && !closed && <label>{direction === "pay" ? "Pay to" : "Receive from"} · required<select value={pairKey} onChange={event => { setPairKey(event.target.value); setAmount(""); setSelected([]); setNotice(""); }}><option value="">Choose a person</option>{relationships.map(item => <option key={item.key} value={item.key}>{direction === "pay" ? item.balance.toName : item.balance.fromName} · {formatMoney(item.balance.directRemaining, item.plan.currency)} outstanding</option>)}</select></label>}
      {data && !relationships.length && <p>No direct receipt balances for this selection. Group offsets remain available under Payments.</p>}
      {balance && plan && !pending && !closed && <>
        <label>Amount · {plan.currency}<input type="text" inputMode="decimal" data-numeric-input="decimal" value={amount} placeholder="0.00" onChange={event => setAmount(event.target.value)} /></label>
        <details><summary>Choose receipts · optional {selected.length ? `(${selected.length} selected)` : ""}</summary><p>Leave all unchecked for automatic allocation: oldest bill first. Same-date bills use a stable receipt-ID order.</p>
          {bills.map(bill => <label className="home-receipt-option" key={bill.expenseId}><input type="checkbox" checked={selected.includes(bill.expenseId)} onChange={event => setSelected(ids => event.target.checked ? [...ids, bill.expenseId] : ids.filter(id => id !== bill.expenseId))} /><span>{bill.description}<small>{bill.expenseDate} · {formatMoney(bill.remainingAmount, plan.currency)} remaining</small></span></label>)}
        </details>
        <p>{selected.length ? "Selected receipts only" : "Automatic allocation: oldest bill first"}</p>
        {amount && (preview.error || exceedsDirect) && <p role="alert">{exceedsDirect ? `Cannot exceed the direct balance of ${formatMoney(balance.directRemaining, plan.currency)}. Previous unassigned payments may already cover part of these bills.` : preview.error}</p>}
        {valid && <div className="home-allocation-preview"><h3>Review before confirming</h3>{preview.allocations.map(item => <div key={item.expenseId}><strong>{item.description}</strong><span>Apply {formatMoney(item.amount, plan.currency)}</span><span>Remaining after this payment: {formatMoney(item.remainingAfter, plan.currency)}</span></div>)}<p>{direction === "pay" ? "Recorded payments remain pending until the receiver confirms." : "Confirm only money you have actually received."}</p></div>}
      </>}
    </fieldset>
    {pending && plan && <div className="stack"><p>{formatMoney(pending.amount, plan.currency)} already sent · awaiting receiver confirmation. Do not record it again.</p>{pending.allocations.map(item => <p key={item.expenseId}>{item.description} · {formatMoney(item.amount, plan.currency)}</p>)}{direction === "receive" && <SettlementActionButton key={pending.id} action="MARK_RECEIVED" countryId={plan.countryId} counterpartyUserId={pending.fromUserId} label="Confirm this payment received" onRecorded={recorded} onBusyChange={setSubmitting} />}</div>}
    {valid && plan && balance && <SettlementActionButton key={`${tripId}:${pairKey}:${direction}:${revision}`} action={direction === "pay" ? "MARK_PAID" : "MARK_RECEIVED"} countryId={plan.countryId} counterpartyUserId={direction === "pay" ? balance.toUserId : balance.fromUserId} label={direction === "pay" ? "Confirm payment sent" : "Confirm money received"} currency={plan.currency} maximumAmount={Number(amount)} fixedAmount allocations={preview.allocations.map(item => ({ expenseId: item.expenseId, amount: item.amount }))} onRecorded={recorded} onBusyChange={setSubmitting} />}
  </section>;
}
