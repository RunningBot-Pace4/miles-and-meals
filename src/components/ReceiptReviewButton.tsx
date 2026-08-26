"use client";

import { useState } from "react";

export function ReceiptReviewButton({ expenseId }: { expenseId: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  async function markReviewed() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/expenses/${expenseId}/receipt-review`, { method: "POST" });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to confirm receipt review.");
      setDone(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to confirm receipt review.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <span className="receipt-review-action">
      <button className="button primary" type="button" disabled={busy || done} onClick={() => void markReviewed()}>
        {done ? "Reviewed ✓" : busy ? "Saving…" : "Mark reviewed"}
      </button>
      {error ? <small className="form-error" role="alert">{error}</small> : null}
    </span>
  );
}
