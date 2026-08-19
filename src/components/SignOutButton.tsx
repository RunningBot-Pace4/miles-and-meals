"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { SavingOverlay } from "@/components/SavingOverlay";

export function SignOutButton() {
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);

    try {
      await authClient.signOut();
      window.location.replace("/login");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {busy ? (
        <SavingOverlay
          title="Signing you out"
          message="Closing this session and returning to sign in."
        />
      ) : null}

      <button
        className="link-button"
        type="button"
        onClick={signOut}
        disabled={busy}
      >
        Sign out
      </button>
    </>
  );
}
