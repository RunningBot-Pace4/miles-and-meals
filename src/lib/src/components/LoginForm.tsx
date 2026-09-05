"use client";

import { FullPageLink as Link } from "@/components/FullPageLink";
import { FormEvent, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { safeInternalPath } from "@/lib/navigation-safety";
import { PasswordVisibilityIcon } from "@/components/PasswordVisibilityIcon";

export function LoginForm({ nextPath = "/dashboard" }: { nextPath?: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [rememberLogin, setRememberLogin] = useState(true);

  useEffect(() => {
    try {
      const remembered = window.localStorage.getItem("mnm:remembered-login-email");
      if (remembered) setEmail(remembered);
    } catch {
      // Login remains fully usable when private browsing blocks local storage.
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const submittedEmail = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    try {
      if (rememberLogin) {
        window.localStorage.setItem("mnm:remembered-login-email", submittedEmail);
      } else {
        window.localStorage.removeItem("mnm:remembered-login-email");
      }
    } catch {
      // Session sign-in must not depend on local storage.
    }

    try {
      const result = await authClient.signIn.email({
        email: submittedEmail,
        password,
        rememberMe: rememberLogin,
      });

      if (result.error) {
        setError(result.error.message ?? "Unable to sign in.");
        setBusy(false);
        return;
      }

      window.location.replace(safeInternalPath(nextPath));
    } catch {
      setError("Unable to reach Miles & Meals. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={handleSubmit} aria-busy={busy}>
      <label>
        Email
        <input
          name="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
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
            <PasswordVisibilityIcon visible={showPassword} />
            <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
          </button>
        </span>
      </label>

      <label className="remember-login-option">
        <input
          type="checkbox"
          checked={rememberLogin}
          onChange={(event) => setRememberLogin(event.target.checked)}
        />
        <span>
          <strong>Remember my email</strong>
          <small>Keep me signed in on this device. Your password stays with your phone or browser password manager.</small>
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
        <Link className="auth-link" href={`/register?next=${encodeURIComponent(nextPath)}`}>
          Create account
        </Link>
      </p>
    </form>
  );
}
