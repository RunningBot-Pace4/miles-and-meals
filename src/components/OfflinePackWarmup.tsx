"use client";

import { useEffect, useRef } from "react";
import { writeOfflinePacks, type OfflineTripPack } from "@/lib/offline-pack";

const OFFLINE_PACK_REFRESH_MS = 5 * 60_000;

export function OfflinePackWarmup() {
  const lastRefreshRef = useRef(0);
  const refreshingRef = useRef(false);

  useEffect(() => {
    let disposed = false;

    async function refresh(force = false) {
      if (
        !navigator.onLine ||
        refreshingRef.current ||
        (!force && Date.now() - lastRefreshRef.current < OFFLINE_PACK_REFRESH_MS)
      ) return;

      refreshingRef.current = true;
      try {
        const response = await fetch("/api/offline-pack?all=1", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as { packs?: OfflineTripPack[] };
        if (!disposed) {
          writeOfflinePacks(payload.packs ?? [], "", true);
          lastRefreshRef.current = Date.now();
        }
      } catch {
        // Existing cached pack remains available.
      } finally {
        refreshingRef.current = false;
      }
    }

    void refresh();
    const onRefresh = () => void refresh();
    const onForceRefresh = () => void refresh(true);
    window.addEventListener("focus", onRefresh);
    window.addEventListener("online", onForceRefresh);
    window.addEventListener("mnm:active-trip-changed", onForceRefresh);
    window.addEventListener("mnm:data-synced", onForceRefresh);

    return () => {
      disposed = true;
      window.removeEventListener("focus", onRefresh);
      window.removeEventListener("online", onForceRefresh);
      window.removeEventListener("mnm:active-trip-changed", onForceRefresh);
      window.removeEventListener("mnm:data-synced", onForceRefresh);
    };
  }, []);

  return null;
}
