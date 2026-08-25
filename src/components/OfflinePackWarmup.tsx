"use client";

import { useEffect } from "react";
import { writeOfflinePacks, type OfflineTripPack } from "@/lib/offline-pack";

export function OfflinePackWarmup() {
  useEffect(() => {
    let disposed = false;

    async function refresh() {
      if (!navigator.onLine) return;
      try {
        const response = await fetch("/api/offline-pack?all=1", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as { packs?: OfflineTripPack[] };
        if (!disposed) writeOfflinePacks(payload.packs ?? [], "", true);
      } catch {
        // Existing cached pack remains available.
      }
    }

    void refresh();
    const onRefresh = () => void refresh();
    window.addEventListener("focus", onRefresh);
    window.addEventListener("online", onRefresh);
    window.addEventListener("mnm:active-trip-changed", onRefresh);
    window.addEventListener("mnm:data-synced", onRefresh);

    return () => {
      disposed = true;
      window.removeEventListener("focus", onRefresh);
      window.removeEventListener("online", onRefresh);
      window.removeEventListener("mnm:active-trip-changed", onRefresh);
      window.removeEventListener("mnm:data-synced", onRefresh);
    };
  }, []);

  return null;
}
