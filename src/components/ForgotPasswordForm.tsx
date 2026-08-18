"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";

type ResetRequestError = {
  code?: string;
  message?: string;
  status?: number;
  statusText?: string;
};

function getFriendlyError(error: ResetRequestError): string {
  const combined = [
    error.code,
    error.message,
    error.statusText,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    combined.includes("origin") ||
    combined.includes("trusted") ||
    combined.includes("redirect")
  ) {
    return (
      "This deployment URL is not trusted by the authentication server. " +
      "Redeploy the latest Miles & Meals source and check the Vercel app URL settings."
    );
  }

  if (
    error.status === 429 ||
    combined.includes("rate") ||
    combined.includes("too many")
  ) {
    return "Too many reset attempts. Please wait one minute and try again.";
  }

  if (
    combined.includes("database") ||
    combined.includes("connection") ||
    error.status === 500
  ) {
    return (
      "The password-reset service could not reach the server correctly. " +
      "Check the Vercel Function logs and Neon DATABASE_URL."
    );
  }

  return (
    error.message?.trim() ||
    "Unable to submit the reset request. Please try again."
  );
}

export function ForgotPasswordForm() {
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();

    try {
      const result = await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (result.error) {
        console.error("[Miles & Meals] Password reset request failed:", result.error);
        setError(getFriendlyError(result.error));
        return;
      }

      setSubmitted(true);
    } catch (caught) {
      console.error("[Miles & Meals] Password reset request threw:", caught);

      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to submit the reset request. Please try again.",
      );
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

      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}

      <button className="button primary full" disabled={busy} type="submit">
        {busy ? "Sending…" : "Send reset link"}
      </button>

      <Link className="auth-link auth-link-center" href="/login">
        Back to sign in
      </Link>
    </form>
  );
}
