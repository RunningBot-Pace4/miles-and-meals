"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

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
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function run(
    event: FormEvent<HTMLFormElement>,
    url: string,
    map: (form: FormData) => unknown,
  ) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      const form = new FormData(event.currentTarget);
      await postJson(url, map(form));
      event.currentTarget.reset();
      setMessage("Saved.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Request failed.");
    }
  }

  return (
    <div className="stack gap-lg">
      {message ? <p className="success-text">{message}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <section className="content-grid">
        <form
          className="panel stack"
          onSubmit={(event) =>
            run(event, "/api/admin/users", (form) => ({
              name: String(form.get("name") ?? ""),
              email: String(form.get("email") ?? ""),
              password: String(form.get("password") ?? ""),
            }))
          }
        >
          <h2>Create person</h2>
          <label>
            Name
            <input name="name" required />
          </label>
          <label>
            Email
            <input name="email" type="email" required />
          </label>
          <label>
            Temporary password
            <input name="password" type="password" minLength={12} required />
          </label>
          <button className="button primary" type="submit">
            Create user
          </button>
        </form>

        <form
          className="panel stack"
          onSubmit={(event) =>
            run(event, "/api/admin/users/password", (form) => {
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
            })
          }
        >
          <h2>Reset user password</h2>
          <p className="muted">
            Set a temporary password for a registered traveler. Their existing
            login session will be signed out.
          </p>

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

          <button className="button primary" type="submit">
            Reset password
          </button>
        </form>

        <form
          className="panel stack"
          onSubmit={(event) =>
            run(event, "/api/admin/trips", (form) => ({
              name: String(form.get("name") ?? ""),
              baseCurrency: String(form.get("baseCurrency") ?? "MYR"),
              budget: String(form.get("budget") ?? "0"),
              startDate: String(form.get("startDate") ?? ""),
              endDate: String(form.get("endDate") ?? ""),
            }))
          }
        >
          <h2>Create trip</h2>
          <label>
            Trip name
            <input name="name" required placeholder="Vietnam 2026" />
          </label>
          <label>
            Base currency
            <input name="baseCurrency" defaultValue="MYR" maxLength={3} required />
          </label>
          <label>
            Total budget
            <input name="budget" inputMode="decimal" defaultValue="0" required />
          </label>
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
          <button className="button primary" type="submit">
            Create trip
          </button>
        </form>

        <form
          className="panel stack"
          onSubmit={(event) =>
            run(event, "/api/admin/countries", (form) => ({
              tripId: String(form.get("tripId") ?? ""),
              name: String(form.get("name") ?? ""),
              code: String(form.get("code") ?? ""),
              currencyCode: String(form.get("currencyCode") ?? ""),
              defaultExchangeRate: String(
                form.get("defaultExchangeRate") ?? "1",
              ),
            }))
          }
        >
          <h2>Add country</h2>
          <label>
            Trip
            <select name="tripId" required>
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
          <button className="button primary" type="submit">
            Add country
          </button>
        </form>

        <form
          className="panel stack"
          onSubmit={(event) =>
            run(event, "/api/admin/assignments", (form) => ({
              countryId: String(form.get("countryId") ?? ""),
              userId: String(form.get("userId") ?? ""),
            }))
          }
        >
          <h2>Assign person to country</h2>
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
          <button className="button primary" type="submit">
            Assign
          </button>
        </form>
      </section>
    </div>
  );
}
