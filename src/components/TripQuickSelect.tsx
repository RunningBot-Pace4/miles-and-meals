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

  async function changeTrip(
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
        "/dashboard",
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
