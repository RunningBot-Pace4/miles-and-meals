"use client";

import { useEffect, useState } from "react";
import {
  flushOfflineQueue,
  readOfflineQueue,
  removeOfflineMutation,
  type OfflineMutation,
} from "@/lib/offline-queue";

export function OfflineQueueSync() {
  const [items, setItems] = useState<OfflineMutation[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    let disposed = false;

    function refreshItems() {
      if (!disposed) {
        setItems(readOfflineQueue());
      }
    }

    async function sync(forceBlocked = false) {
      if (!navigator.onLine) {
        refreshItems();
        return;
      }

      setSyncing(true);
      const result = await flushOfflineQueue({ forceBlocked });

      if (disposed) {
        return;
      }

      setSyncing(false);
      refreshItems();

      if (result.synced > 0) {
        window.dispatchEvent(
          new CustomEvent("mnm:network-message", {
            detail: {
              type: "restored",
              message: `${result.synced} offline change${result.synced === 1 ? "" : "s"} synced successfully.`,
            },
          }),
        );
        window.dispatchEvent(new CustomEvent("mnm:data-synced"));
      }
    }

    refreshItems();
    void sync();

    function onVisible() {
      if (document.visibilityState === "visible") {
        void sync();
      }
    }

    function onQueueChanged() {
      refreshItems();
    }

    function onOnline() {
      void sync();
    }

    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onVisible);
    window.addEventListener("mnm:offline-queue-changed", onQueueChanged);
    document.addEventListener("visibilitychange", onVisible);

    const timer = window.setInterval(() => void sync(), 30_000);

    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("mnm:offline-queue-changed", onQueueChanged);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (items.length === 0) {
    return null;
  }

  const blocked = items.filter((item) => item.blocked).length;

  function discard(id: string) {
    if (!window.confirm("Discard this offline change? It will not be sent to the trip.")) {
      return;
    }

    removeOfflineMutation(id);
    setItems(readOfflineQueue());
  }

  async function retryAll() {
    if (!navigator.onLine) {
      window.dispatchEvent(
        new CustomEvent("mnm:network-message", {
          detail: {
            type: "warning",
            message: "You are still offline. Your changes remain safely stored on this device.",
          },
        }),
      );
      return;
    }

    setSyncing(true);
    await flushOfflineQueue({ forceBlocked: true });
    setSyncing(false);
    setItems(readOfflineQueue());
    window.dispatchEvent(new CustomEvent("mnm:data-synced"));
  }

  return (
    <div className={expanded ? "offline-queue-manager open" : "offline-queue-manager"}>
      <button
        className={blocked > 0 ? "offline-queue-pill needs-attention" : "offline-queue-pill"}
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        aria-label={`${items.length} offline change${items.length === 1 ? "" : "s"}${blocked > 0 ? `, ${blocked} needs attention` : ", waiting to sync"}`}
      >
        <span aria-hidden="true">{blocked > 0 ? "!" : "↻"}</span>
        <strong>{items.length}</strong>
        <small>{blocked > 0 ? "needs attention" : "waiting to sync"}</small>
      </button>

      {expanded ? (
        <section className="offline-queue-sheet" aria-label="Offline changes" aria-live="polite">
          <div className="offline-queue-sheet-head">
            <div>
              <strong>Offline changes</strong>
              <small>
                {blocked > 0
                  ? `${blocked} change${blocked === 1 ? "" : "s"} needs your review.`
                  : "Stored safely on this device until sync completes."}
              </small>
            </div>
            <button type="button" onClick={() => setExpanded(false)} aria-label="Close offline changes">×</button>
          </div>

          <div className="offline-queue-items">
            {items.map((item) => (
              <article className={item.blocked ? "offline-queue-item blocked" : "offline-queue-item"} key={item.id}>
                <div>
                  <strong>{item.label}</strong>
                  <small>
                    {item.lastError ?? (item.blocked ? "This change needs review before retrying." : "Waiting for connection.")}
                  </small>
                </div>
                <button type="button" onClick={() => discard(item.id)}>Discard</button>
              </article>
            ))}
          </div>

          <button className="button primary offline-retry-button" type="button" disabled={syncing} onClick={() => void retryAll()}>
            {syncing ? "Retrying…" : blocked > 0 ? "Retry reviewed changes" : "Retry now"}
          </button>
        </section>
      ) : null}
    </div>
  );
}
