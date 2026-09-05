"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { FullPageLink as Link } from "@/components/FullPageLink";

const NOTIFICATION_POLL_INTERVAL_MS = 60_000;

export const NOTIFICATION_UPDATED_EVENT =
  "mnm:notifications-updated";

export function NotificationBell({
  initialUnreadCount,
}: {
  initialUnreadCount: number;
}) {
  const [unreadCount, setUnreadCount] =
    useState(
      initialUnreadCount,
    );
  const refreshingRef = useRef(false);

  const refresh =
    useCallback(async () => {
      if (!navigator.onLine) {
        return;
      }

      if (
        refreshingRef.current ||
        document.visibilityState !== "visible"
      ) {
        return;
      }

      refreshingRef.current = true;

      try {
        const response = await fetch(
          `/api/notifications/unread?t=${Date.now()}`,
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          return;
        }

        const payload =
          (await response.json()) as {
            unreadCount?: number;
          };

        setUnreadCount(
          Math.max(
            0,
            Number(
              payload.unreadCount ??
                0,
            ),
          ),
        );
      } catch {
        // Keep the current badge if a background refresh fails.
      } finally {
        refreshingRef.current = false;
      }
    }, []);

  useEffect(() => {
    const timer =
      window.setInterval(
        () => void refresh(),
        NOTIFICATION_POLL_INTERVAL_MS,
      );

    function refreshVisible() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void refresh();
      }
    }

    window.addEventListener(
      NOTIFICATION_UPDATED_EVENT,
      refreshVisible,
    );
    window.addEventListener(
      "focus",
      refreshVisible,
    );
    document.addEventListener(
      "visibilitychange",
      refreshVisible,
    );

    return () => {
      window.clearInterval(timer);
      window.removeEventListener(
        NOTIFICATION_UPDATED_EVENT,
        refreshVisible,
      );
      window.removeEventListener(
        "focus",
        refreshVisible,
      );
      document.removeEventListener(
        "visibilitychange",
        refreshVisible,
      );
    };
  }, [refresh]);

  return (
    <Link
      className="notification-bell"
      href="/notifications"
      aria-label={
        unreadCount > 0
          ? `${unreadCount} unread notifications`
          : "Notifications"
      }
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
        <path d="M10 21h4" />
      </svg>

      {unreadCount > 0 ? (
        <span>
          {unreadCount > 99
            ? "99+"
            : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
