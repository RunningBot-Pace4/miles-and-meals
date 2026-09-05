"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { SavingOverlay } from "@/components/SavingOverlay";
import { DateRangePicker } from "@/components/DateRangePicker";
import { countryCatalog } from "@/lib/country-catalog";
import { compactOptionText } from "@/lib/display-text";

type Trip = {
  id: string;
  name: string;
  baseCurrency: string;
};

type UserOption = {
  id: string;
  name: string;
  email: string;
};

type FxResponse = {
  baseCurrency?: string;
  quoteCurrency?: string;
  rate?: number;
  rateDate?: string;
  provider?: string;
  error?: string;
};

type FormKey =
  | "create-user"
  | "reset-password"
  | "create-trip"
  | "add-country";

const adminLoadingCopy: Record<
  FormKey,
  { title: string; message: string }
> = {
  "create-user": {
    title: "Creating traveler",
    message: "Preparing their account, user type and security.",
  },
  "reset-password": {
    title: "Resetting password",
    message: "Securing the traveler account and next sign-in.",
  },
  "create-trip": {
    title: "Creating trip",
    message: "Setting up the shared travel workspace.",
  },
  "add-country": {
    title: "Adding country",
    message: "Updating currencies, access and trip planning.",
  },
};

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed.");
  }
}

function SubmitButton({
  active,
  disabled = false,
  idleLabel,
  busyLabel,
}: {
  active: boolean;
  disabled?: boolean;
  idleLabel: string;
  busyLabel: string;
}) {
  return (
    <button
      className="button primary"
      type="submit"
      disabled={active || disabled}
    >
      {active ? (
        <>
          <span className="button-spinner" aria-hidden="true" />
          {busyLabel}
        </>
      ) : (
        idleLabel
      )}
    </button>
  );
}

export function AdminForms({
  trips,
  users,
}: {
  trips: Trip[];
  users: UserOption[];
}) {
  const [busyForm, setBusyForm] = useState<FormKey | null>(null);
  const [createTripStartDate, setCreateTripStartDate] = useState("");
  const [createTripEndDate, setCreateTripEndDate] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const initialCountryTripId =
    trips.length === 1 ? trips[0].id : "";
  const [countryTripId, setCountryTripId] =
    useState(initialCountryTripId);
  const [countryCode, setCountryCode] = useState("");
  const [fxRate, setFxRate] = useState("");
  const [fxRateDate, setFxRateDate] = useState("");
  const [fxProvider, setFxProvider] = useState("");
  const [fxError, setFxError] = useState("");
  const [fxBusy, setFxBusy] = useState(false);
  const [fxRefreshKey, setFxRefreshKey] = useState(0);
  const fxManualOverrideRef = useRef(false);
  const fxRequestControllerRef =
    useRef<AbortController | null>(null);

  const selectedCatalogCountry = useMemo(
    () =>
      countryCatalog.find(
        (country) => country.code === countryCode,
      ) ?? null,
    [countryCode],
  );

  const selectedCountryTrip = useMemo(
    () =>
      trips.find(
        (trip) => trip.id === countryTripId,
      ) ?? null,
    [countryTripId, trips],
  );

  useEffect(() => {
    const currency =
      selectedCatalogCountry?.currencyCode ?? "";

    if (!countryTripId || !currency) {
      fxRequestControllerRef.current?.abort();
      fxRequestControllerRef.current = null;
      setFxRate("");
      setFxRateDate("");
      setFxProvider("");
      setFxError("");
      setFxBusy(false);
      return;
    }

    const controller = new AbortController();
    fxRequestControllerRef.current = controller;

    async function loadDailyFx() {
      setFxBusy(true);
      setFxError("");

      try {
        const query = new URLSearchParams({
          tripId: countryTripId,
          currency,
        });

        const response = await fetch(
          `/api/admin/fx?${query.toString()}`,
          {
            signal: controller.signal,
            cache: "no-store",
          },
        );

        const payload =
          (await response.json().catch(() => ({}))) as FxResponse;

        if (!response.ok) {
          throw new Error(
            payload.error ??
              "Unable to load the daily FX rate.",
          );
        }

        if (
          typeof payload.rate !== "number" ||
          !Number.isFinite(payload.rate) ||
          payload.rate <= 0
        ) {
          throw new Error(
            "The FX provider returned an invalid rate.",
          );
        }

        if (fxManualOverrideRef.current) {
          return;
        }

        setFxRate(
          payload.rate
            .toFixed(10)
            .replace(/0+$/, "")
            .replace(/\.$/, ""),
        );
        setFxRateDate(payload.rateDate ?? "");
        setFxProvider(
          payload.provider ?? "Daily reference",
        );
      } catch (caught) {
        if (
          controller.signal.aborted ||
          fxManualOverrideRef.current
        ) {
          return;
        }

        setFxRate("");
        setFxRateDate("");
        setFxProvider("");
        setFxError(
          caught instanceof Error
            ? `${caught.message} Enter the rate manually if needed.`
            : "Unable to load the daily FX rate. Enter it manually.",
        );
      } finally {
        if (
          !controller.signal.aborted &&
          !fxManualOverrideRef.current
        ) {
          setFxBusy(false);
        }
      }
    }

    void loadDailyFx();

    return () => {
      controller.abort();

      if (
        fxRequestControllerRef.current ===
        controller
      ) {
        fxRequestControllerRef.current = null;
      }
    };
  }, [
    countryTripId,
    fxRefreshKey,
    selectedCatalogCountry?.currencyCode,
  ]);


  function selectTrip(nextTripId: string) {
    fxManualOverrideRef.current = false;
    fxRequestControllerRef.current?.abort();
    setFxRate("");
    setFxRateDate("");
    setFxProvider("");
    setFxError("");
    setCountryTripId(nextTripId);
  }

  function selectCountry(nextCountryCode: string) {
    fxManualOverrideRef.current = false;
    fxRequestControllerRef.current?.abort();
    setFxRate("");
    setFxRateDate("");
    setFxProvider("");
    setFxError("");
    setCountryCode(nextCountryCode);
  }

  function setManualFxRate(value: string) {
    fxManualOverrideRef.current = true;
    fxRequestControllerRef.current?.abort();
    fxRequestControllerRef.current = null;
    setFxBusy(false);
    setFxError("");
    setFxRateDate("");
    setFxProvider(
      value.trim() ? "Manual override" : "",
    );
    setFxRate(value);
  }

  function refreshDailyFx() {
    fxManualOverrideRef.current = false;
    setFxRate("");
    setFxRateDate("");
    setFxProvider("");
    setFxError("");
    setFxRefreshKey(
      (current) => current + 1,
    );
  }

  useEffect(() => {
    if (!message) {
      return;
    }

    const timer = window.setTimeout(() => {
      setMessage("");
    }, 3500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [message]);

  async function run(
    event: FormEvent<HTMLFormElement>,
    formKey: FormKey,
    url: string,
    map: (form: FormData) => unknown,
    successMessage: string,
    afterSuccess?: () => void,
  ) {
    event.preventDefault();

    const formElement = event.currentTarget;

    setError("");
    setMessage("");
    setBusyForm(formKey);

    try {
      const form = new FormData(formElement);
      const body = map(form);

      await postJson(url, body);

      formElement.reset();
      afterSuccess?.();
      setMessage(successMessage);
      window.location.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Request failed.");
    } finally {
      setBusyForm(null);
    }
  }

  const activeLoading =
    busyForm ? adminLoadingCopy[busyForm] : null;

  return (
    <div className="stack gap-lg">
      {activeLoading ? (
        <SavingOverlay
          title={activeLoading.title}
          message={activeLoading.message}
        />
      ) : null}
      {message ? (
        <div className="form-notice form-toast success-text" role="status">
          <span>✓</span>
          <div>{message}</div>
          <button
            className="notice-dismiss"
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setMessage("")}
          >
            ×
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="form-notice error-text" role="alert">
          <span>!</span>
          {error}
        </div>
      ) : null}

      <section className="admin-form-grid">
        <form
          className="panel stack admin-form-card"
          onSubmit={(event) =>
            run(
              event,
              "create-user",
              "/api/admin/users",
              (form) => ({
                name: String(form.get("name") ?? ""),
                email: String(form.get("email") ?? ""),
                password: String(form.get("password") ?? ""),
                role: String(form.get("role") ?? "user"),
              }),
              "Person created with the selected user type and a temporary password.",
            )
          }
        >
          <div className="admin-form-heading">
            <span className="admin-form-icon">☺</span>
            <div>
              <p className="eyebrow">PEOPLE</p>
              <h2>Create person</h2>
            </div>
          </div>

          <label>
            Name
            <input name="name" required placeholder="Traveler name" />
          </label>

          <label>
            Email
            <input
              name="email"
              type="email"
              required
              placeholder="traveler@example.com"
            />
          </label>

          <label>
            Temporary password
            <input
              name="password"
              type="password"
              minLength={12}
              maxLength={128}
              required
            />
          </label>

          <label>
            User type
            <select
              name="role"
              defaultValue="user"
              required
            >
              <option value="user">
                Traveler
              </option>
              <option value="admin">
                Admin
              </option>
            </select>
          </label>

          <SubmitButton
            active={busyForm === "create-user"}
            idleLabel="Create user"
            busyLabel="Creating…"
          />
        </form>

        <form
          className="panel stack admin-form-card"
          onSubmit={(event) =>
            run(
              event,
              "reset-password",
              "/api/admin/users/password",
              (form) => {
                const newPassword = String(form.get("newPassword") ?? "");
                const confirmPassword = String(
                  form.get("confirmPassword") ?? "",
                );

                if (newPassword !== confirmPassword) {
                  throw new Error("Passwords do not match.");
                }

                return {
                  userId: String(form.get("userId") ?? ""),
                  newPassword,
                };
              },
              "Temporary password set. The user must choose their own password at next sign-in.",
            )
          }
        >
          <div className="admin-form-heading">
            <span className="admin-form-icon amber">⌾</span>
            <div>
              <p className="eyebrow">SECURITY</p>
              <h2>Reset user password</h2>
            </div>
          </div>

          <label>
            User
            <select name="userId" required>
              <option value="">Choose user</option>
              {users.map((member) => (
                <option
                  value={member.id}
                  key={member.id}
                  title={`${member.name} · ${member.email}`}
                >
                  {compactOptionText(`${member.name} · ${member.email}`, 38)}
                </option>
              ))}
            </select>
          </label>

          <label>
            New temporary password
            <input
              name="newPassword"
              type="password"
              minLength={12}
              maxLength={128}
              required
            />
          </label>

          <label>
            Confirm password
            <input
              name="confirmPassword"
              type="password"
              minLength={12}
              maxLength={128}
              required
            />
          </label>

          <SubmitButton
            active={busyForm === "reset-password"}
            idleLabel="Reset password"
            busyLabel="Resetting…"
          />
        </form>

        <form
          className="panel stack admin-form-card"
          onSubmit={(event) =>
            run(
              event,
              "create-trip",
              "/api/admin/trips",
              (form) => ({
                name: String(form.get("name") ?? ""),
                baseCurrency: String(form.get("baseCurrency") ?? "MYR"),
                startDate: createTripStartDate,
                endDate: createTripEndDate,
              }),
              "Trip created.",
            )
          }
        >
          <div className="admin-form-heading">
            <span className="admin-form-icon">✦</span>
            <div>
              <p className="eyebrow">TRIPS</p>
              <h2>Create trip</h2>
            </div>
          </div>

          <label>
            Trip name
            <input name="name" required placeholder="Vietnam 2026" />
          </label>

          <div className="two-col">
            <label>
              Base currency
              <input
                name="baseCurrency"
                defaultValue="MYR"
                maxLength={3}
                required
              />
            </label>

            <div className="owner-budget-explainer">
              <strong>
                Personal budgets
              </strong>
              <small>
                Each assigned traveler enters their own budget. The group total is calculated automatically.
              </small>
            </div>
          </div>

          <DateRangePicker
            startDate={createTripStartDate}
            endDate={createTripEndDate}
            startName="startDate"
            endName="endDate"
            label="Trip dates"
            onChange={(range) => {
              setCreateTripStartDate(range.startDate);
              setCreateTripEndDate(range.endDate);
            }}
          />

          <SubmitButton
            active={busyForm === "create-trip"}
            idleLabel="Create trip"
            busyLabel="Creating trip…"
          />
        </form>

        <form
          className="panel stack admin-form-card"
          onSubmit={(event) =>
            run(
              event,
              "add-country",
              "/api/admin/countries",
              (form) => ({
                tripId: countryTripId,
                name: selectedCatalogCountry?.name ?? "",
                code: selectedCatalogCountry?.code ?? "",
                currencyCode:
                  selectedCatalogCountry?.currencyCode ?? "",
                defaultExchangeRate:
                  fxRate ||
                  String(
                    form.get("defaultExchangeRate") ?? "",
                  ),
                fxRateDate,
                fxRateProvider:
                  fxProvider || "Manual",
              }),
              "Country added with its daily FX reference rate.",
              () => {
                fxManualOverrideRef.current = false;
                fxRequestControllerRef.current?.abort();
                fxRequestControllerRef.current = null;
                setCountryCode("");
                setFxRate("");
                setFxRateDate("");
                setFxProvider("");
                setFxError("");
                setCountryTripId(initialCountryTripId);
              },
            )
          }
        >
          <div className="admin-form-heading">
            <span className="admin-form-icon amber">⌖</span>
            <div>
              <p className="eyebrow">COUNTRIES</p>
              <h2>Add country</h2>
            </div>
          </div>

          <label>
            Trip
            <select
              name="tripId"
              required
              value={countryTripId}
              onChange={(event) =>
                selectTrip(event.target.value)
              }
            >
              <option value="">Choose trip</option>
              {trips.map((trip) => (
                <option
                  value={trip.id}
                  key={trip.id}
                  title={`${trip.name} · Base ${trip.baseCurrency}`}
                >
                  {compactOptionText(`${trip.name} · Base ${trip.baseCurrency}`, 36)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Country
            <select
              name="countryCode"
              required
              value={countryCode}
              onChange={(event) =>
                selectCountry(event.target.value)
              }
            >
              <option value="">Choose country</option>
              {countryCatalog.map((country) => (
                <option
                  value={country.code}
                  key={country.code}
                  title={country.name}
                >
                  {compactOptionText(country.name, 36)}
                </option>
              ))}
            </select>
          </label>

          <div className="two-col">
            <label>
              Code
              <input
                name="code"
                value={selectedCatalogCountry?.code ?? ""}
                readOnly
                placeholder="Auto"
              />
            </label>

            <label>
              Currency
              <input
                name="currencyCode"
                value={
                  selectedCatalogCountry?.currencyCode ?? ""
                }
                readOnly
                placeholder="Auto"
              />
            </label>
          </div>

          <label>
            Default FX to trip base currency
            <input
              name="defaultExchangeRate"
              inputMode="decimal"
              data-numeric-input="decimal"
              required
              value={fxRate}
              onChange={(event) =>
                setManualFxRate(event.target.value)
              }
              placeholder={
                fxBusy
                  ? "Loading daily FX…"
                  : "Daily rate or manual fallback"
              }
            />
          </label>

          <div className="admin-fx-helper">
            <div>
              {fxBusy ? (
                <>
                  <span
                    className="button-spinner"
                    aria-hidden="true"
                  />
                  <span>Checking today&apos;s FX rate…</span>
                </>
              ) : fxError ? (
                <span className="error-text">{fxError}</span>
              ) : fxRate ? (
                <span>
                  1 {selectedCatalogCountry?.currencyCode} ={" "}
                  <strong>
                    {fxRate}{" "}
                    {selectedCountryTrip?.baseCurrency}
                  </strong>
                  {fxRateDate ? ` · ${fxRateDate}` : ""}
                  {fxProvider ? ` · ${fxProvider}` : ""}
                </span>
              ) : (
                <span>
                  Choose a trip and country to load the daily
                  reference rate.
                </span>
              )}
            </div>

            <button
              className="button secondary compact-button"
              type="button"
              disabled={
                fxBusy ||
                !countryTripId ||
                !selectedCatalogCountry
              }
              onClick={refreshDailyFx}
            >
              Refresh FX
            </button>
          </div>

          <SubmitButton
            active={busyForm === "add-country"}
            disabled={
              fxBusy ||
              !countryTripId ||
              !selectedCatalogCountry ||
              !fxRate
            }
            idleLabel="Add country"
            busyLabel="Adding…"
          />
        </form>

      </section>
    </div>
  );
}
