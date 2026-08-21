"use client";

import { useEffect, useState } from "react";
import { SavingOverlay } from "@/components/SavingOverlay";
import { formatMoney } from "@/lib/money";

type TripOverview = {
  id: string;
  name: string;
  countryName: string;
  countryCode: string;
  dateLabel: string;
  baseCurrency: string;
  myBudget: number;
  myShareSpent: number;
  myRemaining: number;
  tripExpenses: number;
  travelerCount: number;
};

export function AllTripsOverview({
  trips,
  activeTripId,
}: {
  trips: TripOverview[];
  activeTripId: string;
}) {
  const [switchingId, setSwitchingId] = useState("");

  useEffect(() => {
    setSwitchingId("");
  }, [activeTripId]);

  async function openTrip(tripId: string) {
    if (tripId === activeTripId || switchingId) {
      return;
    }

    if (!navigator.onLine) {
      window.location.assign("/offline.html");
      return;
    }

    setSwitchingId(tripId);

    try {
      const response = await fetch("/api/active-trip", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ tripId }),
      });

      const payload =
        (await response.json().catch(() => ({}))) as {
          error?: string;
        };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to open this trip.");
      }

      window.location.assign("/dashboard");
    } catch (error) {
      setSwitchingId("");
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to open this trip.",
      );
    }
  }

  if (trips.length === 0) {
    return null;
  }

  return (
    <>
      {switchingId ? (
        <SavingOverlay
          title="Opening trip"
          message="Updating your active trip and Home dashboard."
        />
      ) : null}

      <section
        className="all-trips-overview"
        aria-label="All trips"
      >
        <div className="all-trips-grid">
          {trips.map((trip) => {
            const active = trip.id === activeTripId;
            const budgetPercent =
              trip.myBudget > 0
                ? Math.min(
                    100,
                    Math.max(0, (trip.myShareSpent / trip.myBudget) * 100),
                  )
                : 0;

            return (
              <article
                className={
                  active
                    ? "all-trip-card active"
                    : "all-trip-card"
                }
                key={trip.id}
              >
                <div className="all-trip-card-top">
                  <div>
                    <small>{trip.countryCode || "TRIP"}</small>
                    <h3>{trip.name}</h3>
                    <p>
                      {trip.countryName} · {trip.dateLabel}
                    </p>
                  </div>
                  {active ? (
                    <span className="all-trip-active-badge">Current</span>
                  ) : null}
                </div>

                <div className="all-trip-wallet-row">
                  <div>
                    <small>My share</small>
                    <strong>
                      {formatMoney(trip.myShareSpent, trip.baseCurrency)}
                    </strong>
                  </div>
                  <div>
                    <small>My budget</small>
                    <strong>
                      {formatMoney(trip.myBudget, trip.baseCurrency)}
                    </strong>
                  </div>
                  <div>
                    <small>Trip spend</small>
                    <strong>
                      {formatMoney(trip.tripExpenses, trip.baseCurrency)}
                    </strong>
                  </div>
                </div>

                <div className="all-trip-progress" aria-hidden="true">
                  <span style={{ width: `${budgetPercent}%` }} />
                </div>

                <div className="all-trip-card-foot">
                  <span>
                    {trip.myBudget > 0
                      ? `${budgetPercent.toFixed(0)}% of my budget used`
                      : "Personal budget not set"}
                  </span>
                  <span>
                    {trip.travelerCount} traveler
                    {trip.travelerCount === 1 ? "" : "s"}
                  </span>
                </div>

                <button
                  className={active ? "button secondary" : "button primary"}
                  type="button"
                  disabled={active || Boolean(switchingId)}
                  onClick={() => void openTrip(trip.id)}
                >
                  {active ? "Current trip" : "Open this trip"}
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
