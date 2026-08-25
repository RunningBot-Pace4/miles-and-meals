"use client";

import { useEffect, useMemo, useState } from "react";
import {
  flushOfflineQueue,
  readOfflineQueue,
  removeOfflineMutation,
  retryOfflineMutation,
  type OfflineMutation,
} from "@/lib/offline-queue";

function retryText(item: OfflineMutation): string {
  if (item.blocked) return "Needs review before it can sync.";
  if (!item.nextAttemptAt) return "Waiting for connection.";

  const next = Date.parse(item.nextAttemptAt);
  if (!Number.isFinite(next) || next <= Date.now()) return "Ready to retry.";

  const seconds = Math.max(1, Math.ceil((next - Date.now()) / 1000));
  if (seconds < 60) return `Automatic retry in about ${seconds}s.`;
  return `Automatic retry in about ${Math.ceil(seconds / 60)} min.`;
}

export function OfflineQueueSync() {
  const [items, setItems] = useState<OfflineMutation[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const blocked = useMemo(
    () => items.filter((item) => item.blocked).length,
    [items],
  );

  useEffect(() => {
    let disposed = false;

    function refreshItems() {
      if (!disposed) setItems(readOfflineQueue());
    }

    async function sync(forceRetry = false) {
      if (!navigator.onLine) {
        refreshItems();
        return;
      }

      setSyncing(true);
      try {
        const result = await flushOfflineQueue({ forceRetry });
        if (disposed) return;

        refreshItems();

        if (result.synced > 0) {
          window.dispatchEvent(
            new CustomEvent("mnm:network-message", {
              detail: {
                type: "restored",
                message: `${result.synced} offline change${
                  result.synced === 1 ? "" : "s"
                } synced successfully.`,
              },
            }),
          );
          window.dispatchEvent(new CustomEvent("mnm:data-synced"));
        }
      } finally {
        if (!disposed) setSyncing(false);
      }
    }

    refreshItems();
    // A page load immediately after connectivity returns must not inherit a
    // future backoff timestamp from the failed offline request.
    void sync(navigator.onLine);

    function onVisible() {
      if (document.visibilityState === "visible") void sync();
    }

    function onQueueChanged() {
      refreshItems();
    }

    function onOnline() {
      void sync(true);
    }

    function onStorage(event: StorageEvent) {
      if (event.key === "mnm:offline-mutation-queue:v1") {
        refreshItems();
      }
    }

    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onVisible);
    window.addEventListener("storage", onStorage);
    window.addEventListener("mnm:offline-queue-changed", onQueueChanged);
    document.addEventListener("visibilitychange", onVisible);

    const timer = window.setInterval(() => void sync(), 30_000);

    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("mnm:offline-queue-changed", onQueueChanged);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (items.length === 0) return null;

  function discard(id: string) {
    if (
      !window.confirm(
        "Discard this offline change? It will not be sent to the trip.",
      )
    ) {
      return;
    }

    removeOfflineMutation(id);
    setItems(readOfflineQueue());
  }

  async function retryOne(id: string) {
    if (!navigator.onLine) {
      window.dispatchEvent(
        new CustomEvent("mnm:network-message", {
          detail: {
            type: "warning",
            message:
              "You are still offline. This change remains safely stored on this device.",
          },
        }),
      );
      return;
    }

    setRetryingId(id);
    try {
      const result = await retryOfflineMutation(id);
      setItems(readOfflineQueue());
      if (result.synced > 0) {
        window.dispatchEvent(new CustomEvent("mnm:data-synced"));
      }
    } finally {
      setRetryingId(null);
    }
  }

  async function retryAll() {
    if (!navigator.onLine) {
      window.dispatchEvent(
        new CustomEvent("mnm:network-message", {
          detail: {
            type: "warning",
            message:
              "You are still offline. Your changes remain safely stored on this device.",
          },
        }),
      );
      return;
    }

    setSyncing(true);
    try {
      await flushOfflineQueue({ forceRetry: true });
      setItems(readOfflineQueue());
      window.dispatchEvent(new CustomEvent("mnm:data-synced"));
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div
      className={
        expanded ? "offline-queue-manager open" : "offline-queue-manager"
      }
    >
      <button
        className={
          blocked > 0
            ? "offline-queue-pill needs-attention"
            : "offline-queue-pill"
        }
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        aria-label={`${items.length} offline change${
          items.length === 1 ? "" : "s"
        }${
          blocked > 0
            ? `, ${blocked} needs attention`
            : ", waiting to sync"
        }`}
      >
        <span aria-hidden="true">{blocked > 0 ? "!" : syncing ? "…" : "↻"}</span>
        <strong>{items.length}</strong>
        <small>
          {blocked > 0 ? "needs attention" : syncing ? "syncing" : "waiting to sync"}
        </small>
      </button>

      {expanded ? (
        <section
          className="offline-queue-sheet"
          aria-label="Offline changes"
          aria-live="polite"
        >
          <div className="offline-queue-sheet-head">
            <div>
              <strong>Offline changes</strong>
              <small>
                {blocked > 0
                  ? `${blocked} change${blocked === 1 ? "" : "s"} needs your review.`
                  : "Stored safely on this device until sync completes."}
              </small>
            </div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label="Close offline changes"
            >
              ×
            </button>
          </div>

          <div className="offline-queue-items">
            {items.map((item) => (
              <article
                className={
                  item.blocked
                    ? "offline-queue-item blocked"
                    : "offline-queue-item"
                }
                key={item.id}
              >
                <div>
                  <strong>{item.label}</strong>
                  <small>{item.lastError ?? retryText(item)}</small>
                  {item.lastAttemptAt && !item.blocked ? (
                    <small className="offline-queue-attempt-meta">
                      Attempt {item.attempts ?? 0} · last tried {new Intl.DateTimeFormat("en-MY", {
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(item.lastAttemptAt))}
                    </small>
                  ) : null}
                </div>

                <div className="offline-queue-item-actions">
                  {!item.blocked ? (
                    <button
                      type="button"
                      disabled={retryingId === item.id || syncing}
                      onClick={() => void retryOne(item.id)}
                    >
                      {retryingId === item.id ? "Retrying…" : "Retry"}
                    </button>
                  ) : null}
                  <button type="button" onClick={() => discard(item.id)}>
                    Discard
                  </button>
                </div>
              </article>
            ))}
          </div>

          <button
            className="button primary offline-retry-button"
            type="button"
            disabled={syncing || retryingId !== null}
            onClick={() => void retryAll()}
          >
            {syncing
              ? "Syncing…"
              : "Sync retryable changes"}
          </button>
        </section>
      ) : null}
    </div>
  );
}
