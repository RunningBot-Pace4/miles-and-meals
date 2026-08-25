"use client";

import { useState } from "react";
import { SavingOverlay } from "@/components/SavingOverlay";
import type { TripFinancialState } from "@/lib/financial-close";
import { trackProductEvent } from "@/lib/product-analytics-client";

type PendingAction = "CLOSE" | "REOPEN" | null;

function formatClosedAt(value: string | null): string {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export function FinancialClosePanel({
  initialState,
  canManage,
}: {
  initialState: TripFinancialState;
  canManage: boolean;
}) {
  const [state, setState] = useState(initialState);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const closed = state.status === "CLOSED";

  async function mutate(action: "CLOSE" | "REOPEN") {
    setBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/trips/${state.tripId}/financial-close`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        state?: TripFinancialState;
      };

      if (!response.ok || !payload.state) {
        throw new Error(payload.error ?? "Unable to update trip financials.");
      }

      setState(payload.state);
      setPendingAction(null);
      trackProductEvent(
        action === "CLOSE" ? "trip_financials_closed" : "trip_financials_reopened",
        "/settlements",
      );
      window.location.assign(window.location.href);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to update trip financials. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {busy ? (
        <SavingOverlay
          title={closed ? "Reopening Trip" : "Closing Trip"}
          message={
            closed
              ? "Restoring Trip editing and recalculating the live settlement view."
              : "Creating a settlement snapshot and making the Trip read-only."
          }
        />
      ) : null}

      <section
        className={`panel financial-close-panel ${closed ? "closed" : "open"}`}
        aria-labelledby="financial-close-title"
      >
        <div className="financial-close-heading">
          <div className="financial-close-icon" aria-hidden="true">
            {closed ? "✓" : "◎"}
          </div>
          <div>
            <p className="eyebrow">FINANCIAL CHECKPOINT · {state.tripName}</p>
            <h2 id="financial-close-title">
              {closed
                ? `${state.tripName} is closed · expenses are locked`
                : `${state.tripName} is open`}
            </h2>
            <p className="muted">
              {closed
                ? "The whole Trip is read-only: details, travelers, invites, budgets, Plan, Inbox, expenses and live-location updates cannot change. Existing balances and repayment confirmation remain available."
                : "Travelers can still update the Trip and add plans or spending. Close it only when the travel record is complete and the group is ready to settle."}
            </p>
          </div>
          <span className={`financial-close-status ${closed ? "closed" : "open"}`}>
            {closed ? `Closed · v${state.version}` : "Open"}
          </span>
        </div>

        {closed ? (
          <div className="financial-close-meta">
            <span>
              <small>Locked by</small>
              <strong>{state.closedByName ?? "Trip Owner"}</strong>
            </span>
            <span>
              <small>Locked at</small>
              <strong>{formatClosedAt(state.closedAt) || "Recorded"}</strong>
            </span>
            {state.snapshotHash ? (
              <span>
                <small>Snapshot</small>
                <strong>{state.snapshotHash}</strong>
              </span>
            ) : null}
          </div>
        ) : null}

        {canManage ? (
          <div className="financial-close-actions">
            {pendingAction === null ? (
              <button
                className={closed ? "button secondary" : "button primary"}
                type="button"
                onClick={() => setPendingAction(closed ? "REOPEN" : "CLOSE")}
              >
                {closed ? "Reopen Trip" : "Close Trip"}
              </button>
            ) : (
              <div className="financial-close-confirm" role="group" aria-label="Confirm financial checkpoint">
                <div>
                  <strong>
                    {pendingAction === "CLOSE"
                      ? "Ready for final settlement?"
                      : "Need to correct an expense?"}
                  </strong>
                  <p>
                    {pendingAction === "CLOSE"
                      ? "All Trip changes will pause, including details, travelers, budgets, Plan, Inbox, expenses and location sharing. Repayment confirmation remains available."
                      : "Trip editing will reopen and the Smart Settlement recommendation may change."}
                  </p>
                </div>
                <div className="financial-close-confirm-buttons">
                  <button
                    className="button ghost"
                    type="button"
                    onClick={() => setPendingAction(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className={pendingAction === "CLOSE" ? "button primary" : "button secondary"}
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (pendingAction) void mutate(pendingAction);
                    }}
                  >
                    {pendingAction === "CLOSE" ? "Confirm & close Trip" : "Confirm reopen"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="financial-close-owner-note">
            {closed
              ? "Only the Trip Owner or System Admin can reopen this Trip."
              : "The Trip Owner can close the Trip when the group is ready to settle."}
          </p>
        )}

        {error ? (
          <p className="error-text financial-close-error" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    </>
  );
}
