"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const NOTIFICATION_POLL_INTERVAL_MS = 30_000;

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

  if (category === "TRIPS") {
    return "⌁";
  }

  return "•";
}

function categoryLabel(
  category: string,
): string {
  if (category === "PAYMENTS") {
    return "Payment";
  }

  if (category === "EXPENSES") {
    return "Expense";
  }

  if (category === "PLANNER") {
    return "Planner";
  }

  if (category === "TRIPS") {
    return "Trip";
  }

  return "Trip update";
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
  const reloadingRef = useRef(false);
  const [
    selectedNotification,
    setSelectedNotification,
  ] = useState<NotificationItem | null>(
    null,
  );

  const reload = useCallback(
    async () => {
      if (
        reloadingRef.current ||
        !navigator.onLine ||
        document.visibilityState !== "visible"
      ) {
        return;
      }

      reloadingRef.current = true;

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

        setSelectedNotification(
          (current) => {
            if (!current) {
              return null;
            }

            return (
              payload.items.find(
                (item) =>
                  item.id ===
                  current.id,
              ) ?? current
            );
          },
        );
      } catch {
        // The existing inbox remains usable if a background refresh fails.
      } finally {
        reloadingRef.current = false;
      }
    },
    [],
  );

  useEffect(() => {
    const timer = window.setInterval(
      () => void reload(),
      NOTIFICATION_POLL_INTERVAL_MS,
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

  useEffect(() => {
    if (!selectedNotification) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function closeOnEscape(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setSelectedNotification(
          null,
        );
      }
    }

    window.addEventListener(
      "keydown",
      closeOnEscape,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;
      window.removeEventListener(
        "keydown",
        closeOnEscape,
      );
    };
  }, [selectedNotification]);

  async function markRead(
    item: NotificationItem,
  ): Promise<boolean> {
    if (item.readAt) {
      return true;
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
      setSelectedNotification(
        (current) =>
          current?.id ===
          item.id
            ? {
                ...current,
                readAt: now,
              }
            : current,
      );
      setUnreadCount((count) =>
        Math.max(0, count - 1),
      );

      window.dispatchEvent(
        new CustomEvent(
          "mnm:notifications-updated",
        ),
      );

      return true;
    } catch {
      setError(
        "Unable to update notification status.",
      );
      return false;
    } finally {
      setBusyId(null);
    }
  }

  function viewDetails(
    item: NotificationItem,
  ) {
    setSelectedNotification(
      item,
    );

    if (!item.readAt) {
      void markRead(item);
    }
  }

  function openRelatedScreen(
    item: NotificationItem,
  ) {
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
      setSelectedNotification(
        (current) =>
          current
            ? {
                ...current,
                readAt:
                  current.readAt ??
                  now,
              }
            : null,
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
          <span>unread</span>
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
              <button
                type="button"
                className="notification-center-item-main"
                onClick={() =>
                  viewDetails(
                    item,
                  )
                }
              >
                <span
                  className="notification-center-icon"
                  aria-hidden="true"
                >
                  {categoryIcon(
                    item.category,
                  )}
                </span>

                <span className="notification-center-copy">
                  <span className="notification-center-title-row">
                    <strong>
                      {item.title}
                    </strong>

                    {!item.readAt ? (
                      <span className="notification-new-badge">
                        New
                      </span>
                    ) : null}
                  </span>

                  <span className="notification-center-body-preview">
                    {item.body}
                  </span>

                  <small>
                    {formatTime(
                      item.createdAt,
                    )}
                  </small>
                </span>

                <span
                  className="notification-center-chevron"
                  aria-hidden="true"
                >
                  ›
                </span>
              </button>

              {!item.readAt ? (
                <div className="notification-center-quick-action">
                  <button
                    type="button"
                    className="text-button"
                    disabled={
                      busyId !== null
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
                </div>
              ) : null}
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

      {selectedNotification ? (
        <div
          className="notification-detail-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedNotification(
                null,
              );
            }
          }}
        >
          <section
            className="notification-detail-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-detail-title"
          >
            <header className="notification-detail-header">
              <span
                className="notification-detail-icon"
                aria-hidden="true"
              >
                {categoryIcon(
                  selectedNotification.category,
                )}
              </span>

              <div>
                <p className="eyebrow">
                  {categoryLabel(
                    selectedNotification.category,
                  )}
                </p>
                <h2 id="notification-detail-title">
                  {
                    selectedNotification.title
                  }
                </h2>
              </div>

              <button
                className="notification-detail-close"
                type="button"
                aria-label="Close notification details"
                onClick={() =>
                  setSelectedNotification(
                    null,
                  )
                }
              >
                ×
              </button>
            </header>

            <div className="notification-detail-body">
              <p>
                {
                  selectedNotification.body
                }
              </p>

              <div className="notification-detail-meta">
                <span>
                  {formatTime(
                    selectedNotification.createdAt,
                  )}
                </span>
                <span>
                  {selectedNotification.readAt
                    ? "Read"
                    : "Marking as read…"}
                </span>
              </div>
            </div>

            <footer className="notification-detail-actions">
              <button
                className="button secondary"
                type="button"
                onClick={() =>
                  setSelectedNotification(
                    null,
                  )
                }
              >
                Close
              </button>

              <button
                className="button primary"
                type="button"
                onClick={() =>
                  openRelatedScreen(
                    selectedNotification,
                  )
                }
              >
                Open related screen
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}
