"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();

    try {
      const result = await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (result.error) {
        setError("Unable to submit the reset request. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Unable to submit the reset request. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return (
      <div className="stack">
        <div className="auth-success-panel" role="status">
          <strong>Check your email</strong>
          <p>
            If an account exists for that email, Miles & Meals has sent a
            password-reset link.
          </p>
        </div>
        <Link className="button primary full" href="/login">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
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

      {error ? <p className="error-text">{error}</p> : null}

      <button className="button primary full" disabled={busy} type="submit">
        {busy ? "Sending…" : "Send reset link"}
      </button>

      <Link className="auth-link auth-link-center" href="/login">
        Back to sign in
      </Link>
    </form>
  );
}
