"use client";

import { useState } from "react";

export function JourneyTripOpenButton({ tripId }: { tripId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function openTrip() {
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/active-trip", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tripId }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to open this Trip.");
      window.location.assign("/dashboard?view=trip");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to open this Trip.");
      setBusy(false);
    }
  }

  return (
    <div className="journey-trip-open">
      <button className="button secondary" type="button" disabled={busy} onClick={() => void openTrip()}>
        {busy ? "Opening…" : "Open Trip"}
      </button>
      {error ? <small className="form-error" role="alert">{error}</small> : null}
    </div>
  );
}
