"use client";

import {
  useEffect,
  useState,
} from "react";
import { SavingOverlay } from "@/components/SavingOverlay";

type ReceiptPayload = {
  description: string;
  receiptUrl: string;
  embedded: boolean;
  error?: string;
};

export function ReceiptViewerButton({
  expenseId,
}: {
  expenseId: string;
}) {
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] =
    useState<ReceiptPayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!receipt) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        setReceipt(null);
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [receipt]);

  async function openReceipt() {
    setBusy(true);
    setError("");

    try {
      const response = await fetch(
        `/api/expenses/${expenseId}/receipt`,
        {
          cache: "no-store",
        },
      );

      const payload =
        (await response.json().catch(() => ({}))) as
          ReceiptPayload;

      if (!response.ok) {
        throw new Error(
          payload.error ??
            "Unable to load receipt.",
        );
      }

      setReceipt(payload);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load receipt.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {busy ? (
        <SavingOverlay
          title="Opening receipt"
          message="Loading the saved receipt for this expense."
        />
      ) : null}

      <button
        className="receipt-view-button"
        type="button"
        onClick={openReceipt}
        disabled={busy}
      >
        View receipt
      </button>

      {error ? (
        <small
          className="receipt-view-error"
          role="alert"
        >
          {error}
        </small>
      ) : null}

      {receipt ? (
        <div
          className="receipt-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setReceipt(null);
            }
          }}
        >
          <section
            className="receipt-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="receipt-modal-title"
          >
            <header className="receipt-modal-header">
              <div>
                <p className="eyebrow">RECEIPT</p>
                <h2 id="receipt-modal-title">
                  {receipt.description}
                </h2>
              </div>

              <button
                className="receipt-modal-close"
                type="button"
                aria-label="Close receipt"
                onClick={() =>
                  setReceipt(null)
                }
              >
                ×
              </button>
            </header>

            {receipt.embedded ? (
              <div className="receipt-modal-image-wrap">
                <img
                  src={receipt.receiptUrl}
                  alt={`Receipt for ${receipt.description}`}
                  className="receipt-modal-image"
                />
              </div>
            ) : (
              <div className="receipt-modal-external">
                <span>🧾</span>
                <strong>
                  This receipt is stored as an external link.
                </strong>
                <a
                  className="button primary"
                  href={receipt.receiptUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open receipt
                </a>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
