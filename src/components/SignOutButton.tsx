"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { SavingOverlay } from "@/components/SavingOverlay";
import { readOfflineQueue } from "@/lib/offline-queue";
import { clearPrivateDeviceData } from "@/lib/private-device-data";

export function SignOutButton() {
  const [busy, setBusy] = useState(false);

  async function signOut() {
    const waiting = readOfflineQueue().length;
    if (
      waiting > 0 &&
      !window.confirm(
        `You have ${waiting} change${waiting === 1 ? "" : "s"} waiting to sync. Signing out removes those unsynced changes from this device. Sign out anyway?`,
      )
    ) {
      return;
    }

    setBusy(true);

    try {
      await authClient.signOut();
      clearPrivateDeviceData();
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
