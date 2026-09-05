"use client";

import { useEffect, useRef } from "react";
import { writeOfflinePacks, type OfflineTripPack } from "@/lib/offline-pack";

const OFFLINE_PACK_REFRESH_MS = 5 * 60_000;
const OFFLINE_PACK_REFRESH_STORAGE_KEY = "mnm:offline-pack-last-refresh:v1";
const OFFLINE_PACK_WARMUP_DELAY_MS = 1_500;

export function OfflinePackWarmup() {
  const lastRefreshRef = useRef(0);
  const refreshingRef = useRef(false);

  useEffect(() => {
    let disposed = false;

    try {
      lastRefreshRef.current = Number(
        window.localStorage.getItem(OFFLINE_PACK_REFRESH_STORAGE_KEY) ?? 0,
      ) || 0;
    } catch {
      // A private browsing policy may block local storage; the in-memory guard remains.
    }

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
          try {
            window.localStorage.setItem(
              OFFLINE_PACK_REFRESH_STORAGE_KEY,
              String(lastRefreshRef.current),
            );
          } catch {
            // The offline pack itself is still safely written where supported.
          }
        }
      } catch {
        // Existing cached pack remains available.
      } finally {
        refreshingRef.current = false;
      }
    }

    const warmupTimer = window.setTimeout(
      () => void refresh(),
      OFFLINE_PACK_WARMUP_DELAY_MS,
    );
    const onRefresh = () => void refresh();
    const onForceRefresh = () => void refresh(true);
    window.addEventListener("focus", onRefresh);
    window.addEventListener("online", onForceRefresh);
    window.addEventListener("mnm:active-trip-changed", onForceRefresh);
    window.addEventListener("mnm:data-synced", onForceRefresh);

    return () => {
      disposed = true;
      window.clearTimeout(warmupTimer);
      window.removeEventListener("focus", onRefresh);
      window.removeEventListener("online", onForceRefresh);
      window.removeEventListener("mnm:active-trip-changed", onForceRefresh);
      window.removeEventListener("mnm:data-synced", onForceRefresh);
    };
  }, []);

  return null;
}
