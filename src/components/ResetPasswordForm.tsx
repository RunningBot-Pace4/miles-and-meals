"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";

type ResetPasswordFormProps = {
  token: string | null;
  tokenError: string | null;
};

export function ResetPasswordForm({
  token,
  tokenError,
}: ResetPasswordFormProps) {
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setError("This reset link is invalid or has expired.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (newPassword.length < 12) {
      setError("Password must be at least 12 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const result = await authClient.resetPassword({
        newPassword,
        token,
      });

      if (result.error) {
        setError(
          result.error.message ?? "Unable to reset the password. Request a new link.",
        );
        return;
      }

      setComplete(true);
    } catch {
      setError("Unable to reset the password. Request a new link.");
    } finally {
      setBusy(false);
    }
  }

  if (complete) {
    return (
      <div className="stack">
        <div className="auth-success-panel" role="status">
          <strong>Password updated</strong>
          <p>
            Your previous sessions were revoked. Sign in again using your new
            password.
          </p>
        </div>
        <Link className="button primary full" href="/login">
          Sign in
        </Link>
      </div>
    );
  }

  if (!token || tokenError) {
    return (
      <div className="stack">
        <p className="error-text">
          This password-reset link is invalid or has expired.
        </p>
        <Link className="button primary full" href="/forgot-password">
          Request a new reset link
        </Link>
        <Link className="auth-link auth-link-center" href="/login">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <label>
        New password
        <span className="password-input-wrap">
          <input
            name="newPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={12}
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
        Confirm new password
        <input
          name="confirmPassword"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          required
          minLength={12}
        />
      </label>

      <small>Use at least 12 characters.</small>

      {error ? <p className="error-text">{error}</p> : null}

      <button className="button primary full" disabled={busy} type="submit">
        {busy ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
