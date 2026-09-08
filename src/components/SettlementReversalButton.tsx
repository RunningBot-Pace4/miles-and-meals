"use client";

import { useState } from "react";
import { SETTLEMENT_UPDATED_EVENT } from "@/components/SettlementActionButton";
import {
  canReverseSettlement,
  type SettlementStatus,
} from "@/lib/settlement-status";

export function SettlementReversalButton({
  settlementId,
  status,
  currentUserId,
  fromUserId,
  toUserId,
  canManageFinancials,
}: {
  settlementId: string;
  status: SettlementStatus;
  currentUserId: string;
  fromUserId: string;
  toUserId: string;
  canManageFinancials: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const allowed = canReverseSettlement(
    {
      status,
      fromUserId,
      toUserId,
    },
    currentUserId,
    canManageFinancials,
  );

  if (!allowed) {
    return null;
  }

  const isConfirmed = status === "SETTLED";
  const reasonRequired =
    isConfirmed && reason.trim().length < 3;

  async function reversePayment() {
    setBusy(true);
    setError("");

    try {
      const response = await fetch(
        `/api/settlements/${encodeURIComponent(settlementId)}/reverse`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            reason: reason.trim(),
          }),
        },
      );
      const payload =
        (await response.json().catch(() => ({}))) as {
          error?: string;
        };

      if (!response.ok) {
        throw new Error(
          payload.error ??
            "Unable to reverse this payment.",
        );
      }

      window.dispatchEvent(
        new CustomEvent(SETTLEMENT_UPDATED_EVENT),
      );
      setOpen(false);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to reverse this payment.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        className="settlement-reversal-link"
        data-requires-online="true"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
        type="button"
      >
        {isConfirmed
          ? "Reverse payment"
          : "Cancel payment"}
      </button>
    );
  }

  return (
    <div className="settlement-reversal-confirm">
      <strong>
        {isConfirmed
          ? "Reverse confirmed payment?"
          : "Cancel pending payment?"}
      </strong>
      <small>
        {isConfirmed
          ? "The payment stays in history, but it will stop reducing the balance and all linked bills will become outstanding again."
          : "The payment stays in history, but it will no longer reduce the balance or its linked bills."}
      </small>

      {isConfirmed ? (
        <label>
          <span>Reason</span>
          <textarea
            maxLength={500}
            onChange={(event) =>
              setReason(event.target.value)
            }
            placeholder="Example: payment entered twice"
            rows={2}
            value={reason}
          />
        </label>
      ) : null}

      <div className="settlement-reversal-actions">
        <button
          className="button settlement-action-secondary"
          disabled={busy}
          onClick={() => {
            setOpen(false);
            setError("");
          }}
          type="button"
        >
          Keep payment
        </button>
        <button
          className="button settlement-reversal-danger"
          data-requires-online="true"
          disabled={busy || reasonRequired}
          onClick={() => void reversePayment()}
          type="button"
        >
          {busy
            ? "Updating…"
            : isConfirmed
              ? "Confirm reversal"
              : "Confirm cancellation"}
        </button>
      </div>

      {error ? (
        <small
          className="settlement-action-error"
          role="alert"
        >
          {error}
        </small>
      ) : null}
    </div>
  );
}
