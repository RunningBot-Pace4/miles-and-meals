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

const ALL_TRIPS_VALUE = "__all_trips__";

export function TripQuickSelect({
  trips,
  selectedId,
  viewAll = false,
}: {
  trips: TripOption[];
  selectedId: string;
  viewAll?: boolean;
}) {
  const [value, setValue] =
    useState(viewAll ? ALL_TRIPS_VALUE : selectedId);
  const [switching, setSwitching] =
    useState(false);

  useEffect(() => {
    setValue(viewAll ? ALL_TRIPS_VALUE : selectedId);
    setSwitching(false);
  }, [selectedId, viewAll]);

  async function changeTrip(
    nextId: string,
  ) {
    if (nextId === ALL_TRIPS_VALUE) {
      if (viewAll) {
        return;
      }

      setValue(ALL_TRIPS_VALUE);
      setSwitching(true);
      window.location.assign(
        "/dashboard",
      );
      return;
    }

    if (
      !viewAll &&
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

    try {
      const response =
        await fetch(
          "/api/active-trip",
          {
            method: "POST",
            headers: {
              "content-type":
                "application/json",
            },
            body:
              JSON.stringify({
                tripId:
                  nextId,
              }),
          },
        );

      const payload =
        (await response
          .json()
          .catch(
            () => ({}),
          )) as {
          error?: string;
        };

      if (!response.ok) {
        throw new Error(
          payload.error ??
            "Unable to switch trip.",
        );
      }

      window.location.assign(
        "/dashboard?view=trip",
      );
    } catch (error) {
      setValue(
        selectedId,
      );
      setSwitching(false);
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to switch trip.",
      );
    }
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
            void changeTrip(
              event.target
                .value,
            )
          }
        >
          <option value={ALL_TRIPS_VALUE}>
            View all trips
          </option>
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
