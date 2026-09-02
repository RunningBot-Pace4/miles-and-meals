"use client";

import { useEffect, useRef, useState } from "react";

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
  maximumAmount,
  currency,
}: {
  countryId: string;
  counterpartyUserId: string;
  action: SettlementAction;
  label: string;
  maximumAmount?: number;
  currency?: string;
}) {
  const [busy, setBusy] =
    useState(false);
  const [error, setError] =
    useState("");
  const [awaitingRefresh, setAwaitingRefresh] =
    useState(false);
  const [successMessage, setSuccessMessage] =
    useState("");
  const [amount, setAmount] = useState(
    maximumAmount !== undefined ? maximumAmount.toFixed(2) : "",
  );
  const submittedActionRef = useRef<{
    action: SettlementAction;
    currency: string;
  } | null>(null);

  useEffect(() => {
    if (maximumAmount === undefined) {
      return;
    }

    setAmount(maximumAmount.toFixed(2));
    setAwaitingRefresh(false);

    const submitted = submittedActionRef.current;
    if (!submitted) {
      return;
    }

    submittedActionRef.current = null;
    setSuccessMessage(
      `Partial ${submitted.action === "MARK_RECEIVED" ? "receipt" : "payment"} recorded. ${submitted.currency} ${maximumAmount.toFixed(2)} remains.`,
    );

    const timer = window.setTimeout(
      () => setSuccessMessage(""),
      4500,
    );

    return () => window.clearTimeout(timer);
  }, [maximumAmount]);

  async function runAction() {
    setBusy(true);
    setError("");
    setSuccessMessage("");

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
            amount: maximumAmount !== undefined ? Number(amount) : undefined,
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

      submittedActionRef.current = maximumAmount !== undefined
        ? {
            action,
            currency: currency ?? "",
          }
        : null;
      setAwaitingRefresh(true);
      setSuccessMessage(
        maximumAmount !== undefined && Number(amount) < maximumAmount - 0.009
          ? `Partial ${action === "MARK_RECEIVED" ? "receipt" : "payment"} recorded. Refreshing the remaining balance…`
          : "Payment recorded. Refreshing the settlement…",
      );
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
      setAwaitingRefresh(false);
      setBusy(false);
    }
  }

  return (
    <div className="settlement-action-wrap">
      {maximumAmount !== undefined ? (
        <label className="settlement-partial-amount">
          <span>Amount</span>
          <span>
            <b>{currency}</b>
            <input
              inputMode="decimal"
              data-numeric-input="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-label={`${label} amount`}
            />
          </span>
          <small>Enter the full or partial amount received/paid.</small>
        </label>
      ) : null}
      <button
        className={
          action ===
          "MARK_RECEIVED"
            ? "button primary settlement-action-button"
            : "button settlement-action-button settlement-action-secondary"
        }
        disabled={busy || awaitingRefresh || (maximumAmount !== undefined && (!Number.isFinite(Number(amount)) || Number(amount) <= 0 || Number(amount) > maximumAmount + 0.009))}
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
        ) : awaitingRefresh ? (
          <>
            <span
              className="button-spinner"
              aria-hidden="true"
            />
            Refreshing balance…
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

      {successMessage ? (
        <small
          className="settlement-action-success"
          role="status"
        >
          {successMessage}
        </small>
      ) : null}
    </div>
  );
}
