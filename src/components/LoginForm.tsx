"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

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
      <label>
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={12}
        />
      </label>
      {error ? <p className="error-text">{error}</p> : null}
      <button className="button primary full" disabled={busy} type="submit">
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
