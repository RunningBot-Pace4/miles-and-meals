"use client";

import { useState } from "react";
import { SavingOverlay } from "@/components/SavingOverlay";

export function JoinTripInviteButton({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function join() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/invites/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string; budgetPrompt?: boolean; tripId?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to join trip.");
      if (payload.tripId) {
        await fetch("/api/active-trip", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ tripId: payload.tripId }),
        }).catch(() => undefined);
      }
      window.location.replace(payload.budgetPrompt ? "/onboarding/budget" : "/dashboard?view=trip");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to join trip.");
      setBusy(false);
    }
  }

  return (
    <>
      {busy ? <SavingOverlay title="Joining the trip" message="Adding this trip to your travel workspace." /> : null}
      <button className="button primary full" type="button" onClick={() => void join()} disabled={busy}>Join this trip</button>
      {error ? <p className="error-text" role="alert">{error}</p> : null}
    </>
  );
}
