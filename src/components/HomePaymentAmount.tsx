"use client";

import { useId } from "react";
import { formatMoney } from "@/lib/money";

export function HomePaymentAmount({ amount, currency, paying, maximum, selectedMaximum, remaining, error, busy, onChange }: {
  amount: string; currency: string; paying: boolean; maximum: number;
  selectedMaximum?: number; remaining: number | null; error: string;
  busy: boolean; onChange: (amount: string) => void;
}) {
  const id = useId();
  const fullAmount = Math.min(maximum, selectedMaximum ?? maximum);
  return <div className="home-amount-editor">
    <div className="home-amount-heading">
      <label htmlFor={id}>{paying ? "Amount to send" : "Amount received"}</label>
      <span>{formatMoney(maximum, currency)} due</span>
    </div>
    <div className={`home-amount-control${error ? " invalid" : ""}`}>
      <span className="home-amount-currency" aria-hidden="true">{currency}</span>
      <input id={id} aria-label={`${paying ? "Payment" : "Received"} amount in ${currency}`} aria-describedby={`${id}-hint`} aria-invalid={Boolean(error)}
        type="text" inputMode="decimal" enterKeyHint="done" autoComplete="off" data-numeric-input="decimal"
        value={amount} disabled={busy} onChange={event => onChange(event.target.value)}
        onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); } }} />
    </div>
    <div className="home-amount-shortcut">
      <span>Full or partial payment</span>
      <button type="button" disabled={busy || fullAmount <= 0} onClick={() => onChange(fullAmount.toFixed(2))}>{selectedMaximum === undefined ? "Use full amount" : "Use selected bills’ balance"}</button>
    </div>
    <p id={`${id}-hint`} className={error ? "home-amount-error" : "home-amount-hint"} aria-live="polite">
      {error || (remaining !== null ? `${formatMoney(remaining, currency)} left${paying ? " after confirmation" : " after this payment"}` : "Enter the amount you want to record.")}
    </p>
  </div>;
}
