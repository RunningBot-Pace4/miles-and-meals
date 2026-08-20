"use client";

import {
  useEffect,
  useState,
} from "react";
import { SavingOverlay } from "@/components/SavingOverlay";

type TripOption = {
  id: string;
  name: string;
};

export function TripQuickSelect({
  trips,
  selectedId,
}: {
  trips: TripOption[];
  selectedId: string;
}) {
  const [value, setValue] =
    useState(selectedId);
  const [switching, setSwitching] =
    useState(false);

  useEffect(() => {
    setValue(selectedId);
    setSwitching(false);
  }, [selectedId]);

  function changeTrip(
    nextId: string,
  ) {
    if (
      nextId === selectedId
    ) {
      return;
    }

    if (!navigator.onLine) {
      setValue(selectedId);
      window.location.assign(
        "/offline.html",
      );
      return;
    }

    setValue(nextId);
    setSwitching(true);
    window.location.assign(
      `/dashboard?trip=${encodeURIComponent(
        nextId,
      )}`,
    );
  }

  return (
    <>
      {switching ? (
        <SavingOverlay
          title="Switching trip"
          message="Opening the selected travel wallet and destinations."
        />
      ) : null}

      <label className="destination-switcher">
        <span className="destination-switcher-label">
          <span
            aria-hidden="true"
          >
            ✦
          </span>
          Trip
        </span>

        <select
          aria-label="Change dashboard trip"
          value={value}
          disabled={
            switching
          }
          onChange={(
            event,
          ) =>
            changeTrip(
              event.target
                .value,
            )
          }
        >
          {trips.map(
            (trip) => (
              <option
                key={
                  trip.id
                }
                value={
                  trip.id
                }
              >
                {
                  trip.name
                }
              </option>
            ),
          )}
        </select>
      </label>
    </>
  );
}
