"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

type NotificationItem = {
  id: string;
  category: string;
  title: string;
  body: string;
  url: string;
  readAt: string | null;
  createdAt: string;
};

type InboxPayload = {
  unreadCount: number;
  items: NotificationItem[];
};

function categoryIcon(
  category: string,
): string {
  if (category === "PAYMENTS") {
    return "↔";
  }

  if (category === "EXPENSES") {
    return "◫";
  }

  if (category === "PLANNER") {
    return "✦";
  }

  return "•";
}

function formatTime(
  value: string,
): string {
  return new Intl.DateTimeFormat(
    "en-MY",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(new Date(value));
}

export function NotificationCenter({
  initial,
}: {
  initial: InboxPayload;
}) {
  const [items, setItems] =
    useState(initial.items);
  const [unreadCount, setUnreadCount] =
    useState(initial.unreadCount);
  const [busyId, setBusyId] =
    useState<string | null>(null);
  const [error, setError] =
    useState("");

  const reload = useCallback(
    async () => {
      try {
        const response = await fetch(
          "/api/notifications/inbox",
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          return;
        }

        const payload =
          (await response.json()) as InboxPayload;

        setItems(payload.items);
        setUnreadCount(
          payload.unreadCount,
        );
      } catch {
        // The existing inbox remains usable if a background refresh fails.
      }
    },
    [],
  );

  useEffect(() => {
    const timer = window.setInterval(
      () => void reload(),
      15000,
    );

    function refreshWhenVisible() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void reload();
      }
    }

    window.addEventListener(
      "focus",
      refreshWhenVisible,
    );
    document.addEventListener(
      "visibilitychange",
      refreshWhenVisible,
    );

    return () => {
      window.clearInterval(timer);
      window.removeEventListener(
        "focus",
        refreshWhenVisible,
      );
      document.removeEventListener(
        "visibilitychange",
        refreshWhenVisible,
      );
    };
  }, [reload]);

  async function markRead(
    item: NotificationItem,
  ) {
    if (item.readAt) {
      return;
    }

    setBusyId(item.id);
    setError("");

    try {
      const response = await fetch(
        "/api/notifications/inbox",
        {
          method: "POST",
          headers: {
            "content-type":
              "application/json",
          },
          body: JSON.stringify({
            id: item.id,
          }),
        },
      );

      if (!response.ok) {
        throw new Error();
      }

      const now =
        new Date().toISOString();

      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                readAt: now,
              }
            : entry,
        ),
      );
      setUnreadCount((count) =>
        Math.max(0, count - 1),
      );

      window.dispatchEvent(
        new CustomEvent(
          "mnm:notifications-updated",
        ),
      );
    } catch {
      setError(
        "Unable to update notification status.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function openNotification(
    item: NotificationItem,
  ) {
    if (!item.readAt) {
      await markRead(item);
    }

    window.location.assign(
      item.url,
    );
  }

  async function markAllRead() {
    if (unreadCount === 0) {
      return;
    }

    setBusyId("ALL");
    setError("");

    try {
      const response = await fetch(
        "/api/notifications/inbox",
        {
          method: "POST",
          headers: {
            "content-type":
              "application/json",
          },
          body: JSON.stringify({
            all: true,
          }),
        },
      );

      if (!response.ok) {
        throw new Error();
      }

      const now =
        new Date().toISOString();

      setItems((current) =>
        current.map((entry) => ({
          ...entry,
          readAt:
            entry.readAt ?? now,
        })),
      );
      setUnreadCount(0);

      window.dispatchEvent(
        new CustomEvent(
          "mnm:notifications-updated",
        ),
      );
    } catch {
      setError(
        "Unable to mark notifications as read.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="stack gap-lg">
      <section className="notification-center-toolbar">
        <div>
          <strong>
            {unreadCount}
          </strong>
          <span>
            unread
          </span>
        </div>

        <button
          className="button secondary"
          type="button"
          onClick={markAllRead}
          disabled={
            unreadCount === 0 ||
            busyId !== null
          }
        >
          {busyId === "ALL"
            ? "Updating…"
            : "Mark all read"}
        </button>
      </section>

      {error ? (
        <p
          className="form-error"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <section className="notification-center-list">
        {items.length ? (
          items.map((item) => (
            <article
              className={
                item.readAt
                  ? "notification-center-item"
                  : "notification-center-item unread"
              }
              key={item.id}
            >
              <span
                className="notification-center-icon"
                aria-hidden="true"
              >
                {categoryIcon(
                  item.category,
                )}
              </span>

              <div className="notification-center-copy">
                <div>
                  <strong>
                    {item.title}
                  </strong>
                  {!item.readAt ? (
                    <span>
                      New
                    </span>
                  ) : null}
                </div>

                <p>{item.body}</p>
                <small>
                  {formatTime(
                    item.createdAt,
                  )}
                </small>

                <div className="notification-center-actions">
                  <button
                    type="button"
                    className="button secondary"
                    disabled={
                      busyId !==
                      null
                    }
                    onClick={() =>
                      void openNotification(
                        item,
                      )
                    }
                  >
                    Open
                  </button>

                  {!item.readAt ? (
                    <button
                      type="button"
                      className="text-button"
                      disabled={
                        busyId !==
                        null
                      }
                      onClick={() =>
                        void markRead(
                          item,
                        )
                      }
                    >
                      {busyId ===
                      item.id
                        ? "Updating…"
                        : "Mark read"}
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))
        ) : (
          <article className="empty-card">
            <h2>
              No notifications yet
            </h2>
            <p>
              Payment, expense and planner updates will appear here.
            </p>
          </article>
        )}
      </section>
    </div>
  );
}
