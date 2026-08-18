"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function RegisterForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setBusy(false);
      return;
    }

    const result = await authClient.signUp.email({
      name,
      email,
      password,
    });

    if (result.error) {
      setError(result.error.message ?? "Unable to create account.");
      setBusy(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <label>
        Name
        <input
          name="name"
          type="text"
          autoComplete="name"
          minLength={2}
          maxLength={100}
          required
          placeholder="Your name"
        />
      </label>

      <label>
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </label>

      <label>
        Password
        <span className="password-input-wrap">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
          />
          <button
            className="password-toggle"
            type="button"
            aria-pressed={showPassword}
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </span>
      </label>

      <label>
        Confirm password
        <input
          name="confirmPassword"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
        />
      </label>

      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}

      <button className="button primary full" disabled={busy} type="submit">
        {busy ? "Creating account…" : "Create account"}
      </button>

      <p className="muted" style={{ textAlign: "center", margin: 0 }}>
        Already registered?{" "}
        <Link className="auth-link" href="/login">
          Sign in
        </Link>
      </p>
    </form>
  );
}
