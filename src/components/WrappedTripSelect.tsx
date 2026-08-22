"use client";

import { type ChangeEvent, useState } from "react";
import { SavingOverlay } from "@/components/SavingOverlay";

type TripOption = {
  id: string;
  name: string;
};

async function activateTrip(tripId: string): Promise<void> {
  const response = await fetch("/api/active-trip", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tripId }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? "Unable to switch trip.");
  }
}

export function WrappedTripSelect({
  trips,
  selectedId,
}: {
  trips: TripOption[];
  selectedId: string;
}) {
  const [value, setValue] = useState(selectedId);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState("");

  async function changeTrip(nextTripId: string) {
    if (!nextTripId || nextTripId === value || switching) return;

    setValue(nextTripId);
    setSwitching(true);
    setError("");

    if (!navigator.onLine) {
      window.location.assign("/offline.html");
      return;
    }

    try {
      await activateTrip(nextTripId);
      window.location.assign(`/wrapped?tripId=${encodeURIComponent(nextTripId)}`);
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
          title="Opening your travel story"
          message="Switching the trip and preparing its highlights."
        />
      ) : null}

      <div className="wrapped-trip-picker wrapped-trip-picker-auto">
        <label>
          Trip
          <select
            aria-label="Choose trip story"
            value={value}
            disabled={switching}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => void changeTrip(event.target.value)}
          >
            {trips.map((trip) => (
              <option value={trip.id} key={trip.id}>
                {trip.name}
              </option>
            ))}
          </select>
        </label>
        <small className="wrapped-trip-picker-hint">Select a trip to open it instantly.</small>
        {error ? <p className="error-text" role="alert">{error}</p> : null}
      </div>
    </>
  );
}
