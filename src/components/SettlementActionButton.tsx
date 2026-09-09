"use client";

import { useEffect, useRef, useState } from "react";
import { compressPaymentProofForDatabase } from "@/lib/payment-proof-storage";

type SettlementAction =
  | "MARK_PAID"
  | "MARK_RECEIVED";

type SettlementAllocation = {
  expenseId: string;
  amount: number;
};

type PaymentMethod =
  | ""
  | "CASH"
  | "DUITNOW"
  | "BANK_TRANSFER"
  | "TOUCH_N_GO"
  | "CARD"
  | "OTHER";

export const SETTLEMENT_UPDATED_EVENT =
  "mnm:settlement-updated";

function createSettlementRequestId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    /[xy]/g,
    (char) => {
      const random = Math.floor(Math.random() * 16);
      const value =
        char === "x"
          ? random
          : (random & 0x3) | 0x8;
      return value.toString(16);
    },
  );
}

export function SettlementActionButton({
  countryId,
  counterpartyUserId,
  action,
  label,
  maximumAmount,
  currency,
  allocations = [],
  fixedAmount = false,
  onRecorded,
}: {
  countryId: string;
  counterpartyUserId: string;
  action: SettlementAction;
  label: string;
  maximumAmount?: number;
  currency?: string;
  allocations?: SettlementAllocation[];
  fixedAmount?: boolean;
  onRecorded?: () => void;
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
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("");
  const [paymentReference, setPaymentReference] =
    useState("");
  const [paymentNote, setPaymentNote] =
    useState("");
  const [paymentProofData, setPaymentProofData] =
    useState("");
  const [paymentProofName, setPaymentProofName] =
    useState("");
  const [paymentProofBusy, setPaymentProofBusy] =
    useState(false);
  const [paymentProofError, setPaymentProofError] =
    useState("");
  const submittedActionRef = useRef<{
    action: SettlementAction;
    currency: string;
  } | null>(null);
  const requestIdRef = useRef<string | null>(null);

  const showPaymentDetails = maximumAmount !== undefined;

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

  async function handleProofFile(file: File | null) {
    setPaymentProofError("");

    if (!file) {
      setPaymentProofData("");
      setPaymentProofName("");
      return;
    }

    setPaymentProofBusy(true);

    try {
      const compressed = await compressPaymentProofForDatabase(file);
      setPaymentProofData(compressed);
      setPaymentProofName(file.name);
    } catch (caught) {
      setPaymentProofData("");
      setPaymentProofName("");
      setPaymentProofError(
        caught instanceof Error
          ? caught.message
          : "Unable to prepare the payment screenshot.",
      );
    } finally {
      setPaymentProofBusy(false);
    }
  }

  function clearPaymentDetails() {
    setPaymentMethod("");
    setPaymentReference("");
    setPaymentNote("");
    setPaymentProofData("");
    setPaymentProofName("");
    setPaymentProofError("");
  }

  async function runAction() {
    setBusy(true);
    setError("");
    setSuccessMessage("");

    const requestId =
      requestIdRef.current ??
      createSettlementRequestId();
    requestIdRef.current = requestId;
    let responseReceived = false;

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
            requestId,
            countryId,
            counterpartyUserId,
            action,
            amount:
              maximumAmount !== undefined
                ? fixedAmount
                  ? maximumAmount
                  : Number(amount)
                : undefined,
            allocations,
            paymentMethod: paymentMethod || undefined,
            paymentReference: paymentReference.trim() || undefined,
            paymentNote: paymentNote.trim() || undefined,
            paymentProofData: paymentProofData || undefined,
          }),
        },
      );
      responseReceived = true;

      const payload =
        (await response
          .json()
          .catch(() => ({}))) as {
          error?: string;
        };

      if (!response.ok) {
        requestIdRef.current = null;
        throw new Error(
          payload.error ??
            "Unable to update payment status.",
        );
      }

      requestIdRef.current = null;
      submittedActionRef.current =
        maximumAmount !== undefined
          ? {
              action,
              currency: currency ?? "",
            }
          : null;
      setAwaitingRefresh(true);
      setSuccessMessage(
        maximumAmount !== undefined &&
          (fixedAmount ? maximumAmount : Number(amount)) <
            maximumAmount - 0.009
          ? `Partial ${action === "MARK_RECEIVED" ? "receipt" : "payment"} recorded. Refreshing the remaining balance…`
          : "Payment saved. The latest balance is being loaded.",
      );
      clearPaymentDetails();
      window.dispatchEvent(
        new CustomEvent(
          SETTLEMENT_UPDATED_EVENT,
          { detail: { saved: true, countryId } },
        ),
      );
      setBusy(false);
      onRecorded?.();
    } catch (caught) {
      if (responseReceived) {
        requestIdRef.current = null;
      }

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
      {maximumAmount !== undefined && !fixedAmount ? (
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

      {showPaymentDetails ? (
        <details className="settlement-payment-details">
          <summary>Payment details · optional</summary>
          <div className="settlement-payment-details-grid">
            <label>
              <span>Method</span>
              <select
                value={paymentMethod}
                onChange={(event) =>
                  setPaymentMethod(event.target.value as PaymentMethod)
                }
              >
                <option value="">Not specified</option>
                <option value="DUITNOW">DuitNow</option>
                <option value="BANK_TRANSFER">Bank transfer</option>
                <option value="TOUCH_N_GO">Touch &apos;n Go</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="OTHER">Other</option>
              </select>
            </label>

            <label>
              <span>Reference number</span>
              <input
                maxLength={120}
                onChange={(event) => setPaymentReference(event.target.value)}
                placeholder="Optional transfer reference"
                value={paymentReference}
              />
            </label>

            <label className="settlement-payment-note-field">
              <span>Note</span>
              <textarea
                maxLength={500}
                onChange={(event) => setPaymentNote(event.target.value)}
                placeholder="What this payment was for"
                rows={2}
                value={paymentNote}
              />
            </label>

            <label className="settlement-payment-proof-field">
              <span>Payment proof</span>
              <input
                accept="image/jpeg,image/png,image/webp"
                disabled={paymentProofBusy}
                onChange={(event) =>
                  void handleProofFile(event.target.files?.[0] ?? null)
                }
                type="file"
              />
              <small>
                {paymentProofBusy
                  ? "Compressing screenshot…"
                  : paymentProofName
                    ? `${paymentProofName} ready`
                    : "Optional JPEG, PNG or WebP screenshot."}
              </small>
            </label>

            {paymentProofData ? (
              <button
                className="settlement-proof-remove"
                onClick={() => void handleProofFile(null)}
                type="button"
              >
                Remove proof
              </button>
            ) : null}

            {paymentProofError ? (
              <small className="settlement-action-error" role="alert">
                {paymentProofError}
              </small>
            ) : null}
          </div>
        </details>
      ) : null}

      <button
        className={
          action ===
          "MARK_RECEIVED"
            ? "button primary settlement-action-button"
            : "button settlement-action-button settlement-action-secondary"
        }
        disabled={
          busy || awaitingRefresh || paymentProofBusy ||
          (maximumAmount !== undefined &&
            (fixedAmount
              ? maximumAmount <= 0
              : !Number.isFinite(Number(amount)) ||
                Number(amount) <= 0 ||
                Number(amount) > maximumAmount + 0.009))
        }
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
            Payment saved
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
