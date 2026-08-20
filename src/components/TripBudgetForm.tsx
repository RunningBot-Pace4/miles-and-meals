"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  clearDraft,
  draftKey,
  readDraft,
  writeDraft,
} from "@/lib/draft-storage";
import { SavingOverlay } from "@/components/SavingOverlay";

type BudgetTrip = {
  tripId: string;
  tripName: string;
  baseCurrency: string;
  amount: number | null;
};

export function TripBudgetForm({
  trips,
  onboarding = false,
}: {
  trips: BudgetTrip[];
  onboarding?: boolean;
}) {
  const storageKey =
    draftKey(
      "budget",
      onboarding
        ? "onboarding"
        : "settings",
    );

  const initialValues =
    useMemo(
      () =>
        Object.fromEntries(
          trips.map((trip) => [
            trip.tripId,
            trip.amount !== null
              ? String(
                  trip.amount,
                )
              : "",
          ]),
        ),
      [trips],
    );

  const [values, setValues] =
    useState<
      Record<string, string>
    >(initialValues);
  const [busy, setBusy] =
    useState(false);
  const [error, setError] =
    useState("");
  const [message, setMessage] =
    useState("");
  const [
    draftRecovered,
    setDraftRecovered,
  ] = useState(false);
  const [dirty, setDirty] =
    useState(false);

  useEffect(() => {
    const stored =
      readDraft<
        Record<string, string>
      >(storageKey);

    if (stored) {
      setValues((current) => ({
        ...current,
        ...stored.data,
      }));
      setDraftRecovered(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (
      busy ||
      !dirty
    ) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          writeDraft(
            storageKey,
            values,
          );
        },
        300,
      );

    return () =>
      window.clearTimeout(
        timer,
      );
  }, [
    busy,
    dirty,
    storageKey,
    values,
  ]);

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    try {
      for (const trip of trips) {
        const amount =
          values[
            trip.tripId
          ]?.trim() ?? "";

        if (!amount) {
          throw new Error(
            `Enter your budget for ${trip.tripName}.`,
          );
        }

        const response =
          await fetch(
            "/api/budgets",
            {
              method: "POST",
              headers: {
                "content-type":
                  "application/json",
              },
              body:
                JSON.stringify({
                  tripId:
                    trip.tripId,
                  amount,
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
              `Unable to save ${trip.tripName} budget.`,
          );
        }
      }

      clearDraft(
        storageKey,
      );

      window.dispatchEvent(
        new CustomEvent(
          "mnm:budget-updated",
        ),
      );

      if (onboarding) {
        window.location.replace(
          "/dashboard",
        );
        return;
      }

      setDraftRecovered(
        false,
      );
      setDirty(false);
      setMessage(
        "Personal trip budgets updated.",
      );
      setBusy(false);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to save budgets.",
      );
      setBusy(false);
    }
  }

  return (
    <>
      {busy ? (
        <SavingOverlay
          title="Saving your travel wallet"
          message="Updating your personal trip budget."
        />
      ) : null}

      <form
        className="stack gap-lg trip-budget-form"
        onSubmit={submit}
      >
        {draftRecovered ? (
          <div className="budget-draft-note">
            <span
              aria-hidden="true"
            >
              ↺
            </span>
            <div>
              <strong>
                Budget draft restored
              </strong>
              <small>
                Your unfinished budget values from this device were recovered.
              </small>
            </div>
          </div>
        ) : null}

        <div className="trip-budget-entry-list">
          {trips.map(
            (trip) => (
              <label
                className="trip-budget-entry"
                key={
                  trip.tripId
                }
              >
                <span>
                  <strong>
                    {
                      trip.tripName
                    }
                  </strong>
                  <small>
                    Personal budget ·{" "}
                    {
                      trip.baseCurrency
                    }
                  </small>
                </span>

                <div>
                  <b>
                    {
                      trip.baseCurrency
                    }
                  </b>
                  <input
                    inputMode="decimal"
                    min="0.01"
                    step="0.01"
                    required
                    value={
                      values[
                        trip.tripId
                      ] ?? ""
                    }
                    onChange={(
                      event,
                    ) => {
                      setDirty(true);
                      setValues(
                        (
                          current,
                        ) => ({
                          ...current,
                          [trip.tripId]:
                            event
                              .target
                              .value,
                        }),
                      );
                    }}
                    placeholder="5000.00"
                    aria-label={`Budget for ${trip.tripName}`}
                  />
                </div>
              </label>
            ),
          )}
        </div>

        <div className="budget-privacy-note">
          <strong>
            Your personal target
          </strong>
          <small>
            The group dashboard uses the combined total, while your own wallet tracks your personal budget against your personal expense share.
          </small>
        </div>

        {message ? (
          <p
            className="form-success"
            role="status"
          >
            {message}
          </p>
        ) : null}

        {error ? (
          <p
            className="form-error"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <button
          className="button primary"
          type="submit"
          disabled={busy}
        >
          {onboarding
            ? "Start my trip"
            : "Save my budgets"}
        </button>
      </form>
    </>
  );
}
