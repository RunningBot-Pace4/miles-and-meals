"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SavingOverlay } from "@/components/SavingOverlay";

type Trip = {
  id: string;
  name: string;
};

type Country = {
  id: string;
  name: string;
  tripName: string;
};

type UserOption = {
  id: string;
  name: string;
  email: string;
};

type FormKey =
  | "create-user"
  | "reset-password"
  | "create-trip"
  | "add-country"
  | "assign-person";

const adminLoadingCopy: Record<
  FormKey,
  { title: string; message: string }
> = {
  "create-user": {
    title: "Creating traveler",
    message: "Preparing their account and trip access.",
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
  "assign-person": {
    title: "Assigning traveler",
    message: "Updating who can see this country and its trip data.",
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
  idleLabel,
  busyLabel,
}: {
  active: boolean;
  idleLabel: string;
  busyLabel: string;
}) {
  return (
    <button className="button primary" type="submit" disabled={active}>
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
  countries,
  users,
}: {
  trips: Trip[];
  countries: Country[];
  users: UserOption[];
}) {
  const router = useRouter();
  const [busyForm, setBusyForm] = useState<FormKey | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
      setMessage(successMessage);
      router.refresh();
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
              }),
              "Traveler created with a temporary password. They must set their own password after signing in.",
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
                <option value={member.id} key={member.id}>
                  {member.name} · {member.email}
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
                budget: String(form.get("budget") ?? "0"),
                startDate: String(form.get("startDate") ?? ""),
                endDate: String(form.get("endDate") ?? ""),
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
            <label>
              Total budget
              <input
                name="budget"
                inputMode="decimal"
                defaultValue="0"
                required
              />
            </label>
          </div>

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
                tripId: String(form.get("tripId") ?? ""),
                name: String(form.get("name") ?? ""),
                code: String(form.get("code") ?? ""),
                currencyCode: String(form.get("currencyCode") ?? ""),
                defaultExchangeRate: String(
                  form.get("defaultExchangeRate") ?? "1",
                ),
              }),
              "Country added.",
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
              defaultValue={trips.length === 1 ? trips[0].id : ""}
            >
              <option value="">Choose trip</option>
              {trips.map((trip) => (
                <option value={trip.id} key={trip.id}>
                  {trip.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Country
            <input name="name" required placeholder="Vietnam" />
          </label>

          <div className="two-col">
            <label>
              Code
              <input name="code" required maxLength={3} placeholder="VN" />
            </label>
            <label>
              Currency
              <input
                name="currencyCode"
                required
                maxLength={3}
                placeholder="VND"
              />
            </label>
          </div>

          <label>
            Default FX to trip base currency
            <input
              name="defaultExchangeRate"
              inputMode="decimal"
              required
              placeholder="0.000150"
            />
          </label>

          <SubmitButton
            active={busyForm === "add-country"}
            idleLabel="Add country"
            busyLabel="Adding…"
          />
        </form>

        <form
          className="panel stack admin-form-card admin-form-card-wide"
          onSubmit={(event) =>
            run(
              event,
              "assign-person",
              "/api/admin/assignments",
              (form) => ({
                countryId: String(form.get("countryId") ?? ""),
                userId: String(form.get("userId") ?? ""),
              }),
              "Traveler assigned to country.",
            )
          }
        >
          <div className="admin-form-heading">
            <span className="admin-form-icon">◎</span>
            <div>
              <p className="eyebrow">ACCESS</p>
              <h2>Assign person to country</h2>
            </div>
          </div>

          <div className="two-col">
            <label>
              Country
              <select name="countryId" required>
                <option value="">Choose country</option>
                {countries.map((country) => (
                  <option value={country.id} key={country.id}>
                    {country.tripName} · {country.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Person
              <select name="userId" required>
                <option value="">Choose person</option>
                {users.map((member) => (
                  <option value={member.id} key={member.id}>
                    {member.name} · {member.email}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <SubmitButton
            active={busyForm === "assign-person"}
            idleLabel="Assign traveler"
            busyLabel="Assigning…"
          />
        </form>
      </section>
    </div>
  );
}
