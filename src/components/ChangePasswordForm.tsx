"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { SavingOverlay } from "@/components/SavingOverlay";

export function ChangePasswordForm({
  forceChange = false,
}: {
  forceChange?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    setMessage("");
    setError("");

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setError("Your new password must be different from your current password.");
      return;
    }

    setBusy(true);

    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });

      if (result.error) {
        setError(
          result.error.message ??
            "Unable to change password. Check your current password.",
        );
        return;
      }

      const completion = await fetch("/api/account/password-completed", {
        method: "POST",
      });

      if (!completion.ok) {
        setError(
          "Password changed, but the account status could not be updated. Refresh and try again.",
        );
        return;
      }

      formElement.reset();

      if (forceChange) {
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      setMessage("Password changed successfully.");
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to change password.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {busy ? (
        <SavingOverlay
          title="Updating your password"
          message="Securing your account and refreshing your session."
        />
      ) : null}

      <form className="settings-form stack" onSubmit={handleSubmit}>
      <label>
        {forceChange ? "Temporary password" : "Current password"}
        <span className="password-input-wrap">
          <input
            name="currentPassword"
            type={showPasswords ? "text" : "password"}
            autoComplete="current-password"
            minLength={12}
            maxLength={128}
            required
          />
          <button
            className="password-toggle"
            type="button"
            aria-pressed={showPasswords}
            onClick={() => setShowPasswords((value) => !value)}
          >
            {showPasswords ? "Hide" : "Show"}
          </button>
        </span>
      </label>

      <label>
        New password
        <input
          name="newPassword"
          type={showPasswords ? "text" : "password"}
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
        />
      </label>

      <label>
        Confirm new password
        <input
          name="confirmPassword"
          type={showPasswords ? "text" : "password"}
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
        />
      </label>

      <div className="password-rules">
        <span>12+ characters</span>
        <span>Use a password you do not reuse elsewhere</span>
      </div>

      {message ? <p className="success-text" role="status">{message}</p> : null}
      {error ? <p className="error-text" role="alert">{error}</p> : null}

      <button className="button primary" type="submit" disabled={busy}>
        {busy ? (
          <>
            <span className="button-spinner" aria-hidden="true" />
            Updating…
          </>
        ) : forceChange ? (
          "Set my private password"
        ) : (
          "Change password"
        )}
      </button>
      </form>
    </>
  );
}
