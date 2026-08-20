"use client";

import { useState } from "react";

type SettlementAction =
  | "MARK_PAID"
  | "MARK_RECEIVED";

export const SETTLEMENT_UPDATED_EVENT =
  "mnm:settlement-updated";

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
  const [busy, setBusy] =
    useState(false);
  const [error, setError] =
    useState("");

  async function runAction() {
    setBusy(true);
    setError("");

    try {
      const response = await fetch(
        "/api/settlements",
        {
          method: "POST",
          headers: {
            "content-type":
              "application/json",
          },
          body: JSON.stringify({
            countryId,
            counterpartyUserId,
            action,
          }),
        },
      );

      const payload =
        (await response
          .json()
          .catch(() => ({}))) as {
          error?: string;
        };

      if (!response.ok) {
        throw new Error(
          payload.error ??
            "Unable to update payment status.",
        );
      }

      window.dispatchEvent(
        new CustomEvent(
          SETTLEMENT_UPDATED_EVENT,
        ),
      );
      setBusy(false);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to reach Miles & Meals. Please try again.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="settlement-action-wrap">
      <button
        className={
          action ===
          "MARK_RECEIVED"
            ? "button primary settlement-action-button"
            : "button settlement-action-button settlement-action-secondary"
        }
        disabled={busy}
        data-requires-online="true"
        onClick={runAction}
        type="button"
      >
        {busy ? (
          <>
            <span
              className="button-spinner"
              aria-hidden="true"
            />
            Updating…
          </>
        ) : (
          label
        )}
      </button>

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
