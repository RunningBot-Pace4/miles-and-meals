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
  email?: string;
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
  const response = await fetch(url, {
    method,
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload =
    (await response.json().catch(() => ({}))) as ApiPayload;

  if (!response.ok) {
    throw new Error(
      payload.error ?? "Unable to save trip changes.",
    );
  }
}

function ManagedTripCard({
  trip,
  users,
  currentUserId,
}: {
  key?: string;
  trip: ManagedTrip;
  users: TripUser[];
  currentUserId: string;
}) {
  const [name, setName] = useState(trip.name);
  const [startDate, setStartDate] = useState(
    trip.startDate ?? "",
  );
  const [endDate, setEndDate] = useState(
    trip.endDate ?? "",
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [assignments, setAssignments] = useState<
    Record<string, string[]>
  >(() =>
    Object.fromEntries(
      trip.countries.map((country) => [
        country.id,
        country.memberIds,
      ]),
    ),
  );
  const [countryFxDrafts, setCountryFxDrafts] = useState<
    Record<string, string>
  >(() =>
    Object.fromEntries(
      trip.countries.map((country) => [
        country.id,
        country.defaultExchangeRate,
      ]),
    ),
  );

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

  async function saveCountryFx(
    country: ManagedCountry,
  ) {
    const key = `fx:${country.id}`;
    setBusy(key);
    setError("");

    try {
      await mutation(
        `/api/trips/${trip.id}/countries/${country.id}`,
        "PATCH",
        {
          defaultExchangeRate:
            countryFxDrafts[country.id] ??
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
    const key = `${country.id}:${member.id}`;
    setBusy(key);
    setError("");

    try {
      await mutation(
        `/api/trips/${trip.id}/countries/${country.id}/members`,
        assign ? "POST" : "DELETE",
        { userId: member.id },
      );

      setAssignments((current) => {
        const previous = current[country.id] ?? [];

        return {
          ...current,
          [country.id]: assign
            ? [...new Set([...previous, member.id])]
            : previous.filter((id) => id !== member.id),
        };
      });
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

  const destination = trip.countries[0] ?? null;
  const legacyExtraCountries = Math.max(
    0,
    trip.countries.length - 1,
  );

  return (
    <article className="panel owner-trip-card">
      {busy === "trip" ? (
        <SavingOverlay
          title="Updating your trip"
          message="Saving the trip setup securely."
        />
      ) : null}

      <header className="owner-trip-head">
        <div>
          <p className="eyebrow">TRIP OWNER</p>
          <h2>{trip.name}</h2>
          <span>
            Base {trip.baseCurrency}
            {destination ? ` · ${destination.name}` : ""}
          </span>
        </div>

        <span className="admin-status-pill active">Owner</span>
      </header>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <details className="owner-trip-section">
        <summary>Edit trip details</summary>

        <div className="owner-trip-section-body">
          <label>
            Trip name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          <div className="two-col">
            <label>
              Start
              <input
                type="date"
                value={startDate}
                onChange={(event) =>
                  setStartDate(event.target.value)
                }
              />
            </label>

            <label>
              End
              <input
                type="date"
                value={endDate}
                onChange={(event) =>
                  setEndDate(event.target.value)
                }
              />
            </label>
          </div>

          <div className="two-col">
            <label>
              Base currency
              <input value={trip.baseCurrency} readOnly />
            </label>

            <label>
              Destination country
              <input
                value={destination?.name ?? "Not configured"}
                readOnly
              />
            </label>
          </div>

          <small className="muted">
            Base currency and destination country are locked after
            creation so the trip stays consistent.
          </small>

          <button
            className="button secondary"
            type="button"
            data-requires-online="true"
            disabled={busy !== null}
            onClick={() => void saveTrip()}
          >
            Save trip details
          </button>
        </div>
      </details>

      <section className="owner-destinations-section">
        <div className="owner-destinations-toolbar">
          <div>
            <p className="eyebrow">DESTINATION COUNTRY</p>
            <h3>{destination?.name ?? "Not configured"}</h3>
          </div>

          <span className="admin-status-pill active">Locked</span>
        </div>

        {legacyExtraCountries > 0 ? (
          <p className="form-error" role="alert">
            This older trip contains {legacyExtraCountries + 1} countries.
            Adding more destinations is blocked. Ask a System Admin to clean
            up the legacy trip data before continuing.
          </p>
        ) : null}

        <div className="owner-country-list">
          {destination ? (() => {
            const assigned = new Set(
              assignments[destination.id] ??
                destination.memberIds,
            );

            return (
              <details className="owner-country-card">
                <summary>
                  <span>
                    <strong>{destination.name}</strong>
                    <small>
                      {destination.currencyCode} → {trip.baseCurrency} · FX{" "}
                      {destination.defaultExchangeRate}
                    </small>
                  </span>

                  <b>{assigned.size} travelers · Manage</b>
                </summary>

                <div className="owner-country-members">
                  <div className="owner-country-fx-edit">
                    <label>
                      <span>
                        Default FX · 1 {destination.currencyCode} = ?{" "}
                        {trip.baseCurrency}
                      </span>
                      <input
                        inputMode="decimal"
                        data-numeric-input="decimal"
                        value={
                          countryFxDrafts[destination.id] ??
                          destination.defaultExchangeRate
                        }
                        onChange={(event) =>
                          setCountryFxDrafts((current) => ({
                            ...current,
                            [destination.id]: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <button
                      className="button secondary compact-button"
                      type="button"
                      data-requires-online="true"
                      disabled={busy !== null}
                      onClick={() =>
                        void saveCountryFx(destination)
                      }
                    >
                      {busy === `fx:${destination.id}`
                        ? "Saving…"
                        : "Save FX"}
                    </button>
                  </div>

                  <p>
                    Tick the travelers who can see and use this trip
                    destination.
                  </p>

                  {users.map((member) => {
                    const checked = assigned.has(member.id);
                    const key = `${destination.id}:${member.id}`;

                    return (
                      <label key={key}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={busy !== null}
                          onChange={(event) =>
                            void toggleMember(
                              destination,
                              member,
                              event.target.checked,
                            )
                          }
                        />

                        <span>
                          <strong>
                            {member.name}
                            {member.id === currentUserId
                              ? " · You"
                              : ""}
                          </strong>
                          {member.email ? (
                            <small>{member.email}</small>
                          ) : null}
                        </span>

                        <i>
                          {busy === key ? "…" : checked ? "✓" : ""}
                        </i>
                      </label>
                    );
                  })}
                </div>
              </details>
            );
          })() : (
            <div className="empty-card owner-trip-empty">
              <h3>Destination not configured</h3>
              <p>
                New trips require a destination during creation. Ask a
                System Admin to repair this older trip.
              </p>
            </div>
          )}
        </div>
      </section>

      <footer className="owner-trip-foot">
        <Link href="/settings/budgets" className="text-button">
          My personal budget
        </Link>
        <span>Personal budgets are entered by each traveler.</span>
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [createBaseCurrency, setCreateBaseCurrency] =
    useState("MYR");
  const [createCountryCode, setCreateCountryCode] =
    useState("");
  const [createFxRate, setCreateFxRate] = useState("");
  const [createFxDate, setCreateFxDate] = useState("");
  const [createFxProvider, setCreateFxProvider] =
    useState("");
  const [createFxBusy, setCreateFxBusy] = useState(false);
  const createFxAbortRef = useRef<AbortController | null>(null);
  const createManualFxRef = useRef(false);

  const selectedCreateCountry = useMemo(
    () =>
      countryCatalog.find(
        (country) => country.code === createCountryCode,
      ),
    [countryCatalog, createCountryCode],
  );

  async function loadCreateFx(
    country: CountryCatalogItem,
    baseCurrency = createBaseCurrency,
  ) {
    const normalizedBase = baseCurrency.trim().toUpperCase();

    if (normalizedBase.length !== 3) {
      setCreateFxRate("");
      setCreateFxDate("");
      setCreateFxProvider("");
      return;
    }

    createFxAbortRef.current?.abort();
    const controller = new AbortController();
    createFxAbortRef.current = controller;
    createManualFxRef.current = false;
    setCreateFxBusy(true);
    setCreateFxRate("");
    setCreateFxDate("");
    setCreateFxProvider("");
    setError("");

    try {
      const response = await fetch(
        `/api/fx?base=${encodeURIComponent(
          country.currencyCode,
        )}&quote=${encodeURIComponent(normalizedBase)}`,
        {
          cache: "no-store",
          signal: controller.signal,
        },
      );

      const payload =
        (await response.json().catch(() => ({}))) as {
          error?: string;
          rate?: number;
          rateDate?: string;
          provider?: string;
        };

      if (!response.ok) {
        throw new Error(
          payload.error ?? "Unable to load daily FX.",
        );
      }

      if (createManualFxRef.current) {
        return;
      }

      setCreateFxRate(String(payload.rate ?? ""));
      setCreateFxDate(payload.rateDate ?? "");
      setCreateFxProvider(payload.provider ?? "");
    } catch (caught) {
      if (controller.signal.aborted) {
        return;
      }

      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load daily FX.",
      );
    } finally {
      if (createFxAbortRef.current === controller) {
        setCreateFxBusy(false);
      }
    }
  }

  function chooseCreateCountry(code: string) {
    setCreateCountryCode(code);

    const country = countryCatalog.find(
      (item) => item.code === code,
    );

    if (country) {
      void loadCreateFx(country);
      return;
    }

    createFxAbortRef.current?.abort();
    setCreateFxBusy(false);
    setCreateFxRate("");
    setCreateFxDate("");
    setCreateFxProvider("");
  }

  function changeCreateBaseCurrency(value: string) {
    const normalized = value
      .replace(/[^A-Za-z]/g, "")
      .toUpperCase()
      .slice(0, 3);

    setCreateBaseCurrency(normalized);

    if (selectedCreateCountry && normalized.length === 3) {
      void loadCreateFx(selectedCreateCountry, normalized);
    }
  }

  function changeCreateFx(value: string) {
    createManualFxRef.current = true;
    createFxAbortRef.current?.abort();
    setCreateFxBusy(false);
    setCreateFxRate(value);
    setCreateFxDate("");
    setCreateFxProvider("Manual override");
  }

  const managedIds = new Set(
    managedTrips.map((trip) => trip.id),
  );
  const joinedOnly = joinedTrips.filter(
    (trip) => !managedIds.has(trip.id),
  );

  async function createTrip(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError("");

    if (!selectedCreateCountry) {
      setError("Choose the destination country for this trip.");
      return;
    }

    if (!createFxRate.trim()) {
      setError("Confirm the destination FX rate before creating the trip.");
      return;
    }

    setBusy(true);

    const form = new FormData(event.currentTarget);

    try {
      await mutation("/api/trips", "POST", {
        name: String(form.get("name") ?? ""),
        baseCurrency: createBaseCurrency,
        startDate: String(form.get("startDate") ?? ""),
        endDate: String(form.get("endDate") ?? ""),
        firstCountry: {
          code: selectedCreateCountry.code,
          defaultExchangeRate: createFxRate,
          fxRateDate: createFxDate,
          fxRateProvider: createFxProvider || "Manual",
        },
      });

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
            <p className="eyebrow">SELF-SERVICE</p>
            <h2>Create a new trip</h2>
          </div>
        </div>

        <form className="stack" onSubmit={createTrip}>
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
                value={createBaseCurrency}
                maxLength={3}
                onChange={(event) =>
                  changeCreateBaseCurrency(event.target.value)
                }
              />
            </label>

            <label>
              Destination
              <select
                value={createCountryCode}
                required
                onChange={(event) =>
                  chooseCreateCountry(event.target.value)
                }
              >
                <option value="" disabled>
                  Choose country
                </option>
                {countryCatalog.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <small className="muted">
            One trip supports one destination country. The country is
            locked after the trip is created.
          </small>

          {selectedCreateCountry ? (
            <div className="create-trip-country-inline">
              <div className="two-col">
                <label>
                  Country currency
                  <input
                    value={selectedCreateCountry.currencyCode}
                    readOnly
                  />
                </label>

                <label>
                  Default FX · 1 {selectedCreateCountry.currencyCode} = ?{" "}
                  {createBaseCurrency}
                  <input
                    inputMode="decimal"
                    data-numeric-input="decimal"
                    required
                    value={createFxRate}
                    onChange={(event) =>
                      changeCreateFx(event.target.value)
                    }
                    placeholder={
                      createFxBusy
                        ? "Loading daily FX…"
                        : "Daily FX or manual value"
                    }
                  />
                </label>
              </div>

              <div className="admin-fx-helper">
                <span>
                  {createFxBusy
                    ? "Checking today's FX…"
                    : createFxRate
                      ? `${createFxProvider || "Manual"}${
                          createFxDate ? ` · ${createFxDate}` : ""
                        }`
                      : "Enter a valid FX rate."}
                </span>

                <button
                  className="button secondary compact-button"
                  type="button"
                  disabled={
                    createFxBusy || createBaseCurrency.length !== 3
                  }
                  onClick={() =>
                    void loadCreateFx(selectedCreateCountry)
                  }
                >
                  Refresh FX
                </button>
              </div>
            </div>
          ) : null}

          <div className="two-col">
            <label>
              Start
              <input name="startDate" type="date" />
            </label>

            <label>
              End
              <input name="endDate" type="date" />
            </label>
          </div>

          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}

          <button
            className="button primary"
            type="submit"
            disabled={
              busy ||
              createFxBusy ||
              !selectedCreateCountry ||
              !createFxRate.trim()
            }
          >
            Create trip
          </button>
        </form>
      </section>

      {managedTrips.length ? (
        <section className="stack gap-lg">
          <div className="travel-section-heading">
            <div>
              <p className="eyebrow">MY OWNED TRIPS</p>
              <h2>Trip Owner controls</h2>
            </div>
            <span>
              {managedTrips.length}{" "}
              {managedTrips.length === 1 ? "trip" : "trips"}
            </span>
          </div>

          {managedTrips.map((trip) => (
            <ManagedTripCard
              key={trip.id}
              trip={trip}
              users={users}
              currentUserId={currentUserId}
            />
          ))}
        </section>
      ) : null}

      {joinedOnly.length ? (
        <section className="panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">JOINED</p>
              <h2>Trips you travel with</h2>
            </div>
          </div>

          <div className="joined-trip-list">
            {joinedOnly.map((trip) => (
              <article key={trip.id}>
                <div>
                  <strong>{trip.name}</strong>
                  <small>Base {trip.baseCurrency}</small>
                </div>
                <span>Traveler</span>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
