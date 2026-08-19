"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const PROBE_TIMEOUT_MS = 3500;

export function SettlementLiveRefresh({
  intervalMs = 4000,
  showBadge = true,
}: {
  intervalMs?: number;
  showBadge?: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    let disposed = false;
    let refreshInFlight = false;

    function canAttemptRefresh(): boolean {
      return (
        navigator.onLine &&
        document.visibilityState === "visible" &&
        document.body.dataset.actionLoading !== "true"
      );
    }

    async function serverIsReachable(): Promise<boolean> {
      const controller = new AbortController();
      const timer = window.setTimeout(
        () => controller.abort(),
        PROBE_TIMEOUT_MS,
      );

      try {
        const response = await fetch(
          `/api/live-refresh?t=${Date.now()}`,
          {
            method: "GET",
            cache: "no-store",
            credentials: "same-origin",
            headers: {
              accept: "application/json",
            },
            signal: controller.signal,
          },
        );

        return response.ok;
      } catch {
        return false;
      } finally {
        window.clearTimeout(timer);
      }
    }

    async function refresh() {
      if (
        disposed ||
        refreshInFlight ||
        !canAttemptRefresh()
      ) {
        return;
      }

      refreshInFlight = true;

      try {
        if (!(await serverIsReachable())) {
          return;
        }

        if (
          disposed ||
          !canAttemptRefresh()
        ) {
          return;
        }

        router.refresh();
      } finally {
        refreshInFlight = false;
      }
    }

    const timer = window.setInterval(
      () => void refresh(),
      intervalMs,
    );

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }

    function refreshWhenOnline() {
      void refresh();
    }

    function refreshWhenFocused() {
      void refresh();
    }

    window.addEventListener(
      "online",
      refreshWhenOnline,
    );
    window.addEventListener(
      "focus",
      refreshWhenFocused,
    );
    document.addEventListener(
      "visibilitychange",
      refreshWhenVisible,
    );

    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener(
        "online",
        refreshWhenOnline,
      );
      window.removeEventListener(
        "focus",
        refreshWhenFocused,
      );
      document.removeEventListener(
        "visibilitychange",
        refreshWhenVisible,
      );
    };
  }, [intervalMs, router]);

  if (!showBadge) {
    return null;
  }

  return (
    <span
      className="settlement-live-badge"
      title="Settlement status updates automatically while this page is online."
    >
      <i aria-hidden="true" />
      Live updates
    </span>
  );
}
