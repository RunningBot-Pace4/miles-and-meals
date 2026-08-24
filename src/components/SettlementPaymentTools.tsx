"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/money";

export function SettlementPaymentTools({
  tripName,
  fromName,
  toName,
  amount,
  currency,
  currentUserId,
  fromUserId,
  toUserId,
}: {
  tripName: string;
  fromName: string;
  toName: string;
  amount: number;
  currency: string;
  currentUserId: string;
  fromUserId: string;
  toUserId: string;
}) {
  const [status, setStatus] = useState("");
  const formatted = formatMoney(amount, currency);
  const isPayer = currentUserId === fromUserId;
  const isReceiver = currentUserId === toUserId;

  if (!isPayer && !isReceiver) return null;

  const text = isPayer
    ? `${tripName}: I need to pay ${toName} ${formatted}. Smart Settlement recommendation from Miles & Meals.`
    : `${tripName}: ${fromName}, your Smart Settlement amount to me is ${formatted}.`;

  async function copy(value: string, message: string) {
    try {
      await navigator.clipboard.writeText(value);
      setStatus(message);
    } catch {
      setStatus("Copy is not available in this browser. Press and hold the amount instead.");
    }
  }

  async function share() {
    const shareData = {
      title: `${tripName} · settlement`,
      text,
      url: typeof window === "undefined" ? undefined : window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        setStatus("Payment summary shared.");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    await copy(`${text}\n${window.location.href}`, "Payment request copied. Share it in your preferred app.");
  }

  return (
    <div className="settlement-payment-tools" aria-label="Payment tools">
      <button type="button" onClick={() => void copy(amount.toFixed(2), "Amount copied.")}>Copy amount</button>
      <button type="button" onClick={() => void share()}>{isReceiver ? "Request payment" : "Share payment"}</button>
      {status ? <small role="status">{status}</small> : null}
    </div>
  );
}
