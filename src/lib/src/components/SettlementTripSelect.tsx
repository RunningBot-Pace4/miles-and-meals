"use client";

import { useEffect, useRef, useState } from "react";
import { SavingOverlay } from "@/components/SavingOverlay";
import { compactOptionText } from "@/lib/display-text";

type SettlementTripOption = {
  id: string;
  name: string;
  statusLabel: string;
};

async function activateTrip(tripId: string): Promise<void> {
  const response = await fetch("/api/active-trip", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tripId }),
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "Unable to switch trip.");
  }
}

export function SettlementTripSelect({
  trips,
  selectedId,
  activeTripId,
}: {
  trips: SettlementTripOption[];
  selectedId: string;
  activeTripId: string;
}) {
  const [value, setValue] = useState(selectedId);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState("");
  const syncedRef = useRef(false);

  useEffect(() => {
    setValue(selectedId);
  }, [selectedId]);

  useEffect(() => {
    if (
      syncedRef.current ||
      !selectedId ||
      selectedId === activeTripId ||
      !navigator.onLine
    ) {
      return;
    }

    syncedRef.current = true;
    void activateTrip(selectedId).catch(() => {
      // Best-effort only. A future explicit selection retries the active-trip sync.
    });
  }, [activeTripId, selectedId]);

  async function changeTrip(nextTripId: string) {
    if (!nextTripId || nextTripId === selectedId || switching) {
      setValue(nextTripId || selectedId);
      return;
    }

    if (!navigator.onLine) {
      setValue(selectedId);
      setError("Trip switching needs a connection. The currently loaded settlement stays available.");
      return;
    }

    setValue(nextTripId);
    setSwitching(true);
    setError("");

    try {
      await activateTrip(nextTripId);
      window.location.replace(`/settlements?tripId=${encodeURIComponent(nextTripId)}`);
    } catch (caught) {
      setValue(selectedId);
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to open this trip. Please try again.",
      );
      setSwitching(false);
    }
  }

  return (
    <>
      {switching ? (
        <SavingOverlay
          title="Opening settlement"
          message="Switching the active trip and loading its balances."
        />
      ) : null}

      <div className="settle-country-filter settle-country-filter-auto">
        <label>
          Trip
          <select
            value={value}
            aria-label="Choose settlement trip"
            disabled={switching}
            onChange={(event) => void changeTrip(event.target.value)}
          >
            {trips.map((trip) => (
              <option
                value={trip.id}
                key={trip.id}
                title={`${trip.name} · ${trip.statusLabel}`}
              >
                {compactOptionText(`${trip.name} · ${trip.statusLabel}`, 36)}
              </option>
            ))}
          </select>
        </label>

        <small className="settle-trip-auto-hint" aria-live="polite">Select a trip and it opens immediately — no extra View button needed.</small>

        {error ? (
          <p className="error-text settle-trip-switch-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </>
  );
}
