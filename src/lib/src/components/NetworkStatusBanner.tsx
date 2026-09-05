"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

type BannerKind =
  | "offline"
  | "restored"
  | "warning";

type BannerState = {
  kind: BannerKind;
  message: string;
} | null;

type NetworkMessageEvent = CustomEvent<{
  type?: BannerKind;
  message?: string;
}>;

export function NetworkStatusBanner() {
  const [mounted, setMounted] = useState(false);
  const [banner, setBanner] =
    useState<BannerState>(null);
  const wasOfflineRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);

    function clearTimer() {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }

    function showTemporary(
      next: Exclude<BannerState, null>,
      duration = 2600,
    ) {
      clearTimer();
      setBanner(next);

      timerRef.current = window.setTimeout(
        () => setBanner(null),
        duration,
      );
    }

    function goOffline() {
      clearTimer();
      wasOfflineRef.current = true;
      setBanner({
        kind: "offline",
        message:
          "Current screen stays visible. New trip data and changes need a connection.",
      });
    }

    function goOnline() {
      if (!wasOfflineRef.current) {
        setBanner(null);
        return;
      }

      wasOfflineRef.current = false;
      showTemporary({
        kind: "restored",
        message:
          "Connection restored. Miles & Meals is back online.",
      });
    }

    function customMessage(event: Event) {
      const custom =
        event as NetworkMessageEvent;

      showTemporary(
        {
          kind:
            custom.detail?.type ??
            "warning",
          message:
            custom.detail?.message ??
            "Miles & Meals needs your attention.",
        },
        3000,
      );
    }

    if (!navigator.onLine) {
      wasOfflineRef.current = true;
      goOffline();
    }

    window.addEventListener(
      "online",
      goOnline,
    );
    window.addEventListener(
      "offline",
      goOffline,
    );
    window.addEventListener(
      "mnm:network-message",
      customMessage,
    );

    return () => {
      clearTimer();
      window.removeEventListener(
        "online",
        goOnline,
      );
      window.removeEventListener(
        "offline",
        goOffline,
      );
      window.removeEventListener(
        "mnm:network-message",
        customMessage,
      );
    };
  }, []);

  if (!mounted || !banner) {
    return null;
  }

  return (
    <div
      className={[
        "network-offline-banner",
        `network-${banner.kind}`,
      ].join(" ")}
      role="status"
      aria-live="polite"
    >
      <span aria-hidden="true">
        {banner.kind === "restored"
          ? "✓"
          : banner.kind === "warning"
            ? "!"
            : "⌁"}
      </span>
      <strong>
        {banner.kind === "restored"
          ? "Connection restored"
          : banner.kind === "warning"
            ? "Refresh paused"
            : "You’re offline"}
      </strong>
      <small>{banner.message}</small>
    </div>
  );
}
