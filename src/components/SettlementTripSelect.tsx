"use client";

import { useEffect, useRef, useState } from "react";
import { SavingOverlay } from "@/components/SavingOverlay";

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
      // The settlement page can still read an accessible trip even if this
      // best-effort active-trip sync fails. The next explicit switch will retry.
    });
  }, [activeTripId, selectedId]);

  async function changeTrip(nextTripId: string) {
    setValue(nextTripId);
    setError("");

    if (!nextTripId) {
      setError("Choose a trip to view settlement details.");
      return;
    }

    if (nextTripId === selectedId || switching) return;

    if (!navigator.onLine) {
      setValue(selectedId);
      window.location.assign("/offline.html");
      return;
    }

    setSwitching(true);
    setError("");

    try {
      await activateTrip(nextTripId);
      window.location.assign(`/settlements?tripId=${encodeURIComponent(nextTripId)}`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to open this trip. Please try again.",
      );
      setSwitching(false);
      setValue(selectedId);
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
            onChange={(event) => {
              void changeTrip(event.target.value);
            }}
          >
            {trips.map((trip) => (
              <option value={trip.id} key={trip.id}>
                {trip.name} · {trip.statusLabel}
              </option>
            ))}
          </select>
        </label>

        <small className="settle-trip-auto-hint">
          Select a trip to load its balances immediately.
        </small>

        {error ? (
          <p className="error-text settle-trip-switch-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </>
  );
}
