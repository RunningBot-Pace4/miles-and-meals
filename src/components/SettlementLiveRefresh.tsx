"use client";

import {
  useEffect,
  useRef,
} from "react";

const PROBE_TIMEOUT_MS = 3500;

type LiveRefreshPayload = {
  ok?: boolean;
  settlementVersion?: string;
};

export function SettlementLiveRefresh({
  intervalMs = 4000,
  showBadge = true,
}: {
  intervalMs?: number;
  showBadge?: boolean;
}) {
  const versionRef = useRef<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let refreshInFlight = false;

    function canPoll(): boolean {
      return (
        navigator.onLine &&
        document.visibilityState === "visible" &&
        document.body.dataset.actionLoading !== "true"
      );
    }

    async function loadVersion(): Promise<
      string | null
    > {
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

        if (!response.ok) {
          return null;
        }

        const payload =
          (await response.json()) as LiveRefreshPayload;

        return payload.settlementVersion ?? null;
      } catch {
        return null;
      } finally {
        window.clearTimeout(timer);
      }
    }

    async function poll() {
      if (
        disposed ||
        refreshInFlight ||
        !canPoll()
      ) {
        return;
      }

      refreshInFlight = true;

      try {
        const version = await loadVersion();

        if (
          disposed ||
          version === null
        ) {
          return;
        }

        if (versionRef.current === null) {
          versionRef.current = version;
          return;
        }

        if (versionRef.current !== version) {
          window.location.reload();
        }
      } finally {
        refreshInFlight = false;
      }
    }

    void poll();

    const timer = window.setInterval(
      () => void poll(),
      intervalMs,
    );

    function pollWhenVisible() {
      if (document.visibilityState === "visible") {
        void poll();
      }
    }

    function pollWhenOnline() {
      void poll();
    }

    function pollWhenFocused() {
      void poll();
    }

    window.addEventListener(
      "online",
      pollWhenOnline,
    );
    window.addEventListener(
      "focus",
      pollWhenFocused,
    );
    document.addEventListener(
      "visibilitychange",
      pollWhenVisible,
    );

    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener(
        "online",
        pollWhenOnline,
      );
      window.removeEventListener(
        "focus",
        pollWhenFocused,
      );
      document.removeEventListener(
        "visibilitychange",
        pollWhenVisible,
      );
    };
  }, [intervalMs]);

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
