"use client";

import {
  FormEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { FullPageLink as Link } from "@/components/FullPageLink";
import { SavingOverlay } from "@/components/SavingOverlay";

type CountryCatalogItem = {
  name: string;
  code: string;
  currencyCode: string;
};

type ManagedCountry = {
  id: string;
  name: string;
  code: string;
  currencyCode: string;
  defaultExchangeRate: string;
  fxRateDate: string | null;
  fxRateProvider: string | null;
  memberIds: string[];
};

type ManagedTrip = {
  id: string;
  name: string;
  baseCurrency: string;
  startDate: string | null;
  endDate: string | null;
  createdBy: string;
  countries: ManagedCountry[];
};

type TripUser = {
  id: string;
  name: string;
  email: string;
};

type JoinedTrip = {
  id: string;
  name: string;
  baseCurrency: string;
  role: string;
};

type ApiPayload = {
  error?: string;
};

async function mutation(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body: unknown,
): Promise<void> {
  const response = await fetch(
    url,
    {
      method,
      headers: {
        "content-type":
          "application/json",
      },
      body: JSON.stringify(
        body,
      ),
    },
  );

  const payload =
    (await response
      .json()
      .catch(
        () => ({}),
      )) as ApiPayload;

  if (!response.ok) {
    throw new Error(
      payload.error ??
        "Unable to save trip changes.",
    );
  }
}

function ManagedTripCard({
  trip,
  users,
  countryCatalog,
  currentUserId,
}: {
  key?: string;
  trip: ManagedTrip;
  users: TripUser[];
  countryCatalog: CountryCatalogItem[];
  currentUserId: string;
}) {
  const [name, setName] =
    useState(trip.name);
  const [startDate, setStartDate] =
    useState(
      trip.startDate ?? "",
    );
  const [endDate, setEndDate] =
    useState(
      trip.endDate ?? "",
    );
  const [
    countryCode,
    setCountryCode,
  ] = useState("");
  const [fxRate, setFxRate] =
    useState("");
  const [fxDate, setFxDate] =
    useState("");
  const [
    fxProvider,
    setFxProvider,
  ] = useState("");
  const [fxBusy, setFxBusy] =
    useState(false);
  const [busy, setBusy] =
    useState<string | null>(
      null,
    );
  const [error, setError] =
    useState("");
  const [
    assignments,
    setAssignments,
  ] = useState<
    Record<string, string[]>
  >(() =>
    Object.fromEntries(
      trip.countries.map(
        (country) => [
          country.id,
          country.memberIds,
        ],
      ),
    ),
  );

  const [
    countryFxDrafts,
    setCountryFxDrafts,
  ] = useState<
    Record<string, string>
  >(() =>
    Object.fromEntries(
      trip.countries.map(
        (country) => [
          country.id,
          country.defaultExchangeRate,
        ],
      ),
    ),
  );

  const fxAbortRef =
    useRef<AbortController | null>(
      null,
    );
  const manualFxRef =
    useRef(false);

  const selectedCountry =
    countryCatalog.find(
      (country) =>
        country.code ===
        countryCode,
    );

  const availableCountries =
    useMemo(() => {
      const existing =
        new Set(
          trip.countries.map(
            (country) =>
              country.code,
          ),
        );

      return countryCatalog.filter(
        (country) =>
          !existing.has(
            country.code,
          ),
      );
    }, [
      countryCatalog,
      trip.countries,
    ]);

  async function loadFx(
    catalogCountry: CountryCatalogItem,
  ) {
    fxAbortRef.current?.abort();
    const controller =
      new AbortController();
    fxAbortRef.current =
      controller;
    manualFxRef.current =
      false;
    setFxBusy(true);
    setFxRate("");
    setFxDate("");
    setFxProvider("");
    setError("");

    try {
      const response = await fetch(
        `/api/fx?base=${encodeURIComponent(
          catalogCountry.currencyCode,
        )}&quote=${encodeURIComponent(
          trip.baseCurrency,
        )}`,
        {
          cache: "no-store",
          signal:
            controller.signal,
        },
      );

      const payload =
        (await response
          .json()
          .catch(
            () => ({}),
          )) as {
          error?: string;
          rate?: number;
          rateDate?: string;
          provider?: string;
        };

      if (!response.ok) {
        throw new Error(
          payload.error ??
            "Unable to load daily FX.",
        );
      }

      if (
        manualFxRef.current
      ) {
        return;
      }

      setFxRate(
        String(
          payload.rate ?? "",
        ),
      );
      setFxDate(
        payload.rateDate ?? "",
      );
      setFxProvider(
        payload.provider ?? "",
      );
    } catch (caught) {
      if (
        controller.signal
          .aborted
      ) {
        return;
      }

      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load FX.",
      );
    } finally {
      if (
        fxAbortRef.current ===
        controller
      ) {
        setFxBusy(false);
      }
    }
  }

  function chooseCountry(
    code: string,
  ) {
    setCountryCode(code);
    const country =
      countryCatalog.find(
        (item) =>
          item.code === code,
      );

    if (country) {
      void loadFx(country);
    } else {
      setFxRate("");
      setFxDate("");
      setFxProvider("");
    }
  }

  function manualFx(
    value: string,
  ) {
    manualFxRef.current =
      true;
    fxAbortRef.current?.abort();
    setFxBusy(false);
    setFxRate(value);
    setFxDate("");
    setFxProvider(
      "Manual override",
    );
  }

  async function saveTrip() {
    setBusy("trip");
    setError("");

    try {
      await mutation(
        `/api/trips/${trip.id}`,
        "PATCH",
        {
          name,
          startDate,
          endDate,
        },
      );
      window.location.reload();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to update trip.",
      );
      setBusy(null);
    }
  }

  async function addCountry(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !selectedCountry ||
      !fxRate.trim()
    ) {
      setError(
        "Choose a country and confirm its FX rate.",
      );
      return;
    }

    setBusy("country");
    setError("");

    try {
      await mutation(
        `/api/trips/${trip.id}/countries`,
        "POST",
        {
          tripId: trip.id,
          name:
            selectedCountry.name,
          code:
            selectedCountry.code,
          currencyCode:
            selectedCountry.currencyCode,
          defaultExchangeRate:
            fxRate,
          fxRateDate:
            fxDate,
          fxRateProvider:
            fxProvider ||
            "Manual",
        },
      );

      window.location.reload();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to add country.",
      );
      setBusy(null);
    }
  }

  async function saveCountryFx(
    country: ManagedCountry,
  ) {
    const key =
      `fx:${country.id}`;
    setBusy(key);
    setError("");

    try {
      await mutation(
        `/api/trips/${trip.id}/countries/${country.id}`,
        "PATCH",
        {
          defaultExchangeRate:
            countryFxDrafts[
              country.id
            ] ??
            country.defaultExchangeRate,
        },
      );

      setBusy(null);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to update country FX.",
      );
      setBusy(null);
    }
  }

  async function toggleMember(
    country: ManagedCountry,
    member: TripUser,
    assign: boolean,
  ) {
    const key =
      `${country.id}:${member.id}`;
    setBusy(key);
    setError("");

    try {
      await mutation(
        `/api/trips/${trip.id}/countries/${country.id}/members`,
        assign
          ? "POST"
          : "DELETE",
        {
          userId: member.id,
        },
      );

      setAssignments(
        (current) => {
          const previous =
            current[
              country.id
            ] ?? [];

          return {
            ...current,
            [country.id]:
              assign
                ? [
                    ...new Set([
                      ...previous,
                      member.id,
                    ]),
                  ]
                : previous.filter(
                    (id) =>
                      id !==
                      member.id,
                  ),
          };
        },
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to update traveler access.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <article className="panel owner-trip-card">
      {busy === "trip" ||
      busy === "country" ? (
        <SavingOverlay
          title="Updating your trip"
          message="Saving the trip setup securely."
        />
      ) : null}

      <header className="owner-trip-head">
        <div>
          <p className="eyebrow">
            TRIP OWNER
          </p>
          <h2>{trip.name}</h2>
          <span>
            Base{" "}
            {
              trip.baseCurrency
            }{" "}
            ·{" "}
            {
              trip.countries
                .length
            }{" "}
            {trip.countries
              .length === 1
              ? "country"
              : "countries"}
          </span>
        </div>

        <span className="admin-status-pill active">
          Owner
        </span>
      </header>

      {error ? (
        <p
          className="form-error"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <details className="owner-trip-section">
        <summary>
          Edit trip details
        </summary>

        <div className="owner-trip-section-body">
          <label>
            Trip name
            <input
              value={name}
              onChange={(
                event,
              ) =>
                setName(
                  event.target.value,
                )
              }
            />
          </label>

          <div className="two-col">
            <label>
              Start
              <input
                type="date"
                value={
                  startDate
                }
                onChange={(
                  event,
                ) =>
                  setStartDate(
                    event.target
                      .value,
                  )
                }
              />
            </label>

            <label>
              End
              <input
                type="date"
                value={endDate}
                onChange={(
                  event,
                ) =>
                  setEndDate(
                    event.target
                      .value,
                  )
                }
              />
            </label>
          </div>

          <label>
            Base currency
            <input
              value={
                trip.baseCurrency
              }
              readOnly
            />
          </label>

          <small className="muted">
            Base currency stays locked after creation so historical expenses remain consistent.
          </small>

          <button
            className="button secondary"
            type="button"
            data-requires-online="true"
            disabled={
              busy !== null
            }
            onClick={() =>
              void saveTrip()
            }
          >
            Save trip details
          </button>
        </div>
      </details>

      <details className="owner-trip-section">
        <summary>
          Add destination country
        </summary>

        <form
          className="owner-trip-section-body"
          onSubmit={
            addCountry
          }
        >
          <label>
            Country
            <select
              value={
                countryCode
              }
              required
              onChange={(
                event,
              ) =>
                chooseCountry(
                  event.target
                    .value,
                )
              }
            >
              <option value="">
                Choose country
              </option>
              {availableCountries.map(
                (country) => (
                  <option
                    key={
                      country.code
                    }
                    value={
                      country.code
                    }
                  >
                    {
                      country.name
                    }
                  </option>
                ),
              )}
            </select>
          </label>

          {selectedCountry ? (
            <>
              <div className="two-col">
                <label>
                  Currency
                  <input
                    value={
                      selectedCountry.currencyCode
                    }
                    readOnly
                  />
                </label>

                <label>
                  Trip base
                  <input
                    value={
                      trip.baseCurrency
                    }
                    readOnly
                  />
                </label>
              </div>

              <label>
                1{" "}
                {
                  selectedCountry.currencyCode
                }{" "}
                = ?{" "}
                {
                  trip.baseCurrency
                }
                <input
                  inputMode="decimal"
                  required
                  value={
                    fxRate
                  }
                  onChange={(
                    event,
                  ) =>
                    manualFx(
                      event.target
                        .value,
                    )
                  }
                  placeholder={
                    fxBusy
                      ? "Loading daily FX…"
                      : "Daily FX or manual value"
                  }
                />
              </label>

              <div className="admin-fx-helper">
                <span>
                  {fxBusy
                    ? "Checking today's FX…"
                    : fxRate
                      ? `${fxProvider || "Manual"}${fxDate ? ` · ${fxDate}` : ""}`
                      : "Enter a valid FX rate."}
                </span>

                <button
                  className="button secondary compact-button"
                  type="button"
                  disabled={
                    fxBusy
                  }
                  onClick={() =>
                    void loadFx(
                      selectedCountry,
                    )
                  }
                >
                  Refresh FX
                </button>
              </div>
            </>
          ) : null}

          <button
            className="button primary"
            type="submit"
            data-requires-online="true"
            disabled={
              busy !== null ||
              fxBusy ||
              !selectedCountry ||
              !fxRate
            }
          >
            Add country
          </button>
        </form>
      </details>

      <div className="owner-country-list">
        {trip.countries.length ? (
          trip.countries.map(
            (country) => {
              const assigned =
                new Set(
                  assignments[
                    country.id
                  ] ??
                    country.memberIds,
                );

              return (
                <details
                  className="owner-country-card"
                  key={
                    country.id
                  }
                >
                  <summary>
                    <span>
                      <strong>
                        {
                          country.name
                        }
                      </strong>
                      <small>
                        {
                          country.currencyCode
                        }{" "}
                        →{" "}
                        {
                          trip.baseCurrency
                        }{" "}
                        · FX{" "}
                        {
                          country.defaultExchangeRate
                        }
                      </small>
                    </span>

                    <b>
                      {
                        assigned.size
                      }{" "}
                      travelers
                    </b>
                  </summary>

                  <div className="owner-country-members">
                    <div className="owner-country-fx-edit">
                      <label>
                        <span>
                          Default FX · 1 {country.currencyCode} = ? {trip.baseCurrency}
                        </span>
                        <input
                          inputMode="decimal"
                          value={
                            countryFxDrafts[
                              country.id
                            ] ??
                            country.defaultExchangeRate
                          }
                          onChange={(
                            event,
                          ) =>
                            setCountryFxDrafts(
                              (
                                current,
                              ) => ({
                                ...current,
                                [country.id]:
                                  event
                                    .target
                                    .value,
                              }),
                            )
                          }
                        />
                      </label>

                      <button
                        className="button secondary compact-button"
                        type="button"
                        data-requires-online="true"
                        disabled={
                          busy !==
                          null
                        }
                        onClick={() =>
                          void saveCountryFx(
                            country,
                          )
                        }
                      >
                        {busy ===
                        `fx:${country.id}`
                          ? "Saving…"
                          : "Save FX"}
                      </button>
                    </div>

                    <p>
                      Tick the travelers who can see and use this destination.
                    </p>

                    {users.map(
                      (member) => {
                        const checked =
                          assigned.has(
                            member.id,
                          );
                        const key =
                          `${country.id}:${member.id}`;

                        return (
                          <label
                            key={
                              key
                            }
                          >
                            <input
                              type="checkbox"
                              checked={
                                checked
                              }
                              disabled={
                                busy !==
                                null
                              }
                              onChange={(
                                event,
                              ) =>
                                void toggleMember(
                                  country,
                                  member,
                                  event
                                    .target
                                    .checked,
                                )
                              }
                            />

                            <span>
                              <strong>
                                {
                                  member.name
                                }
                                {member.id ===
                                currentUserId
                                  ? " · You"
                                  : ""}
                              </strong>
                              <small>
                                {
                                  member.email
                                }
                              </small>
                            </span>

                            <i>
                              {busy ===
                              key
                                ? "…"
                                : checked
                                  ? "✓"
                                  : ""}
                            </i>
                          </label>
                        );
                      },
                    )}
                  </div>
                </details>
              );
            },
          )
        ) : (
          <div className="empty-card owner-trip-empty">
            <h3>
              Add the first destination
            </h3>
            <p>
              Once a country is added, you are automatically assigned to it and can set your personal trip budget.
            </p>
          </div>
        )}
      </div>

      <footer className="owner-trip-foot">
        <Link
          href="/settings/budgets"
          className="text-button"
        >
          My personal budget
        </Link>
        <span>
          Personal budgets are entered by each traveler.
        </span>
      </footer>
    </article>
  );
}

export function TripManager({
  managedTrips,
  joinedTrips,
  users,
  countryCatalog,
  currentUserId,
}: {
  managedTrips: ManagedTrip[];
  joinedTrips: JoinedTrip[];
  users: TripUser[];
  countryCatalog: CountryCatalogItem[];
  currentUserId: string;
}) {
  const [busy, setBusy] =
    useState(false);
  const [error, setError] =
    useState("");

  const managedIds =
    new Set(
      managedTrips.map(
        (trip) => trip.id,
      ),
    );
  const joinedOnly =
    joinedTrips.filter(
      (trip) =>
        !managedIds.has(
          trip.id,
        ),
    );

  async function createTrip(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const form =
      new FormData(
        event.currentTarget,
      );

    try {
      await mutation(
        "/api/trips",
        "POST",
        {
          name:
            String(
              form.get(
                "name",
              ) ?? "",
            ),
          baseCurrency:
            String(
              form.get(
                "baseCurrency",
              ) ?? "MYR",
            ),
          startDate:
            String(
              form.get(
                "startDate",
              ) ?? "",
            ),
          endDate:
            String(
              form.get(
                "endDate",
              ) ?? "",
            ),
        },
      );

      window.location.reload();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to create trip.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="stack gap-lg">
      {busy ? (
        <SavingOverlay
          title="Creating your trip"
          message="Making you the Trip Owner and preparing the workspace."
        />
      ) : null}

      <section className="panel owner-create-trip">
        <div className="panel-title">
          <div>
            <p className="eyebrow">
              SELF-SERVICE
            </p>
            <h2>
              Create a new trip
            </h2>
          </div>
        </div>

        <form
          className="stack"
          onSubmit={
            createTrip
          }
        >
          <label>
            Trip name
            <input
              name="name"
              required
              minLength={2}
              maxLength={120}
              placeholder="Vietnam 2027"
            />
          </label>

          <div className="two-col">
            <label>
              Base currency
              <input
                name="baseCurrency"
                required
                defaultValue="MYR"
                maxLength={3}
              />
            </label>

            <div className="owner-budget-explainer">
              <strong>
                No group budget here
              </strong>
              <small>
                Each traveler sets their own budget after joining. Miles &amp; Meals automatically combines them.
              </small>
            </div>
          </div>

          <div className="two-col">
            <label>
              Start
              <input
                name="startDate"
                type="date"
              />
            </label>

            <label>
              End
              <input
                name="endDate"
                type="date"
              />
            </label>
          </div>

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
            Create trip
          </button>
        </form>
      </section>

      {managedTrips.length ? (
        <section className="stack gap-lg">
          <div className="travel-section-heading">
            <div>
              <p className="eyebrow">
                MY OWNED TRIPS
              </p>
              <h2>
                Trip Owner controls
              </h2>
            </div>
            <span>
              {managedTrips.length}{" "}
              {managedTrips.length ===
              1
                ? "trip"
                : "trips"}
            </span>
          </div>

          {managedTrips.map(
            (trip) => (
              <ManagedTripCard
                key={
                  trip.id
                }
                trip={trip}
                users={users}
                countryCatalog={
                  countryCatalog
                }
                currentUserId={
                  currentUserId
                }
              />
            ),
          )}
        </section>
      ) : null}

      {joinedOnly.length ? (
        <section className="panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">
                JOINED
              </p>
              <h2>
                Trips you travel with
              </h2>
            </div>
          </div>

          <div className="joined-trip-list">
            {joinedOnly.map(
              (trip) => (
                <article
                  key={
                    trip.id
                  }
                >
                  <div>
                    <strong>
                      {
                        trip.name
                      }
                    </strong>
                    <small>
                      Base{" "}
                      {
                        trip.baseCurrency
                      }
                    </small>
                  </div>
                  <span>
                    Traveler
                  </span>
                </article>
              ),
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
