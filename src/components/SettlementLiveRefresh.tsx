"use client";

import {
  useEffect,
  useMemo,
  useRef,
} from "react";

const PROBE_TIMEOUT_MS = 3500;

export type LiveRefreshChannel =
  | "settlement"
  | "expense"
  | "planner";

type LiveRefreshPayload = {
  settlementVersion?: string;
  expenseVersion?: string;
  plannerVersion?: string;
};

function payloadVersion(
  payload: LiveRefreshPayload,
  channel: LiveRefreshChannel,
): string | null {
  if (channel === "settlement") {
    return payload.settlementVersion ?? null;
  }

  if (channel === "expense") {
    return payload.expenseVersion ?? null;
  }

  return payload.plannerVersion ?? null;
}

export function SettlementLiveRefresh({
  intervalMs = 4000,
  showBadge = true,
  channels = ["settlement"],
}: {
  intervalMs?: number;
  showBadge?: boolean;
  channels?: LiveRefreshChannel[];
}) {
  const versionsRef = useRef<
    Partial<Record<LiveRefreshChannel, string>>
  >({});
  const channelKey = useMemo(
    () => [...channels].sort().join(","),
    [channels],
  );

  useEffect(() => {
    const activeChannels = channelKey
      .split(",")
      .filter(Boolean) as LiveRefreshChannel[];

    let disposed = false;
    let pollInFlight = false;

    function canPoll(): boolean {
      return (
        navigator.onLine &&
        document.visibilityState === "visible" &&
        document.body.dataset.actionLoading !== "true"
      );
    }

    async function loadVersions():
      Promise<LiveRefreshPayload | null> {
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

        return (
          (await response.json()) as LiveRefreshPayload
        );
      } catch {
        return null;
      } finally {
        window.clearTimeout(timer);
      }
    }

    async function poll() {
      if (
        disposed ||
        pollInFlight ||
        !canPoll()
      ) {
        return;
      }

      pollInFlight = true;

      try {
        const payload = await loadVersions();

        if (!payload || disposed) {
          return;
        }

        let changed = false;

        for (const channel of activeChannels) {
          const next = payloadVersion(
            payload,
            channel,
          );

          if (next === null) {
            continue;
          }

          const previous =
            versionsRef.current[channel];

          if (previous === undefined) {
            versionsRef.current[channel] = next;
            continue;
          }

          if (previous !== next) {
            changed = true;
            break;
          }
        }

        if (changed && canPoll()) {
          window.location.reload();
        }
      } finally {
        pollInFlight = false;
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
  }, [channelKey, intervalMs]);

  if (!showBadge) {
    return null;
  }

  return (
    <span
      className="settlement-live-badge"
      title="Shared trip data updates automatically while this page is online."
    >
      <i aria-hidden="true" />
      Live updates
    </span>
  );
}
