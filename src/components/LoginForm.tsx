"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { SavingOverlay } from "@/components/SavingOverlay";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    try {
      const result = await authClient.signIn.email({
        email,
        password,
        rememberMe: true,
      });

      if (result.error) {
        setError(result.error.message ?? "Unable to sign in.");
        setBusy(false);
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Unable to reach Miles & Meals. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <>
      {busy ? (
        <SavingOverlay
          title="Signing you in"
          message="Opening your trips, plans and balances."
        />
      ) : null}

      <form className="stack" onSubmit={handleSubmit}>
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
            autoComplete="current-password"
            required
            minLength={12}
          />
          <button
            className="password-toggle"
            type="button"
            aria-pressed={showPassword}
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </span>
      </label>

      <div className="auth-form-row">
        <span />
        <Link className="auth-link" href="/forgot-password">
          Forgot password?
        </Link>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      <button className="button primary full" disabled={busy} type="submit">
        {busy ? "Signing in…" : "Sign in"}
      </button>

      <p className="muted" style={{ textAlign: "center", margin: 0 }}>
        New traveler?{" "}
        <Link className="auth-link" href="/register">
          Create account
        </Link>
      </p>
      </form>
    </>
  );
}
