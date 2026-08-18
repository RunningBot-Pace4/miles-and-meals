"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SavingOverlay } from "@/components/SavingOverlay";

type SettlementAction = "MARK_PAID" | "MARK_RECEIVED";

export function SettlementActionButton({
  countryId,
  counterpartyUserId,
  action,
  label,
}: {
  countryId: string;
  counterpartyUserId: string;
  action: SettlementAction;
  label: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function runAction() {
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/settlements", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          countryId,
          counterpartyUserId,
          action,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "Unable to update payment status.");
        setBusy(false);
        return;
      }

      router.refresh();
    } catch {
      setError("Unable to reach Miles & Meals. Please try again.");
      setBusy(false);
    }
  }

  return (
    <>
      {busy ? (
        <SavingOverlay
          title={
            action === "MARK_PAID"
              ? "Recording payment"
              : "Confirming money received"
          }
          message="Recalculating the trip balance for everyone."
        />
      ) : null}

      <div className="settlement-action-wrap">
        <button
          className={
            action === "MARK_RECEIVED"
              ? "button primary settlement-action-button"
              : "button settlement-action-button settlement-action-secondary"
          }
          disabled={busy}
          onClick={runAction}
          type="button"
        >
          {label}
        </button>
        {error ? (
          <small className="settlement-action-error" role="alert">
            {error}
          </small>
        ) : null}
      </div>
    </>
  );
}
