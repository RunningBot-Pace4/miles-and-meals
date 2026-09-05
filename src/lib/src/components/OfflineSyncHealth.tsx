"use client";

import { useEffect, useState } from "react";
import {
  readOfflineQueue,
  readOfflineSyncHistory,
  type OfflineMutation,
  type OfflineSyncHistoryItem,
} from "@/lib/offline-queue";

export function OfflineSyncHealth() {
  const [online, setOnline] = useState(true);
  const [queue, setQueue] = useState<OfflineMutation[]>([]);
  const [history, setHistory] = useState<OfflineSyncHistoryItem[]>([]);

  useEffect(() => {
    function refresh() {
      setOnline(navigator.onLine);
      setQueue(readOfflineQueue());
      setHistory(readOfflineSyncHistory());
    }
    refresh();
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    window.addEventListener("mnm:offline-queue-changed", refresh);
    window.addEventListener("mnm:offline-sync-history-changed", refresh);
    return () => {
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
      window.removeEventListener("mnm:offline-queue-changed", refresh);
      window.removeEventListener("mnm:offline-sync-history-changed", refresh);
    };
  }, []);

  const blocked = queue.filter((item) => item.blocked).length;
  return (
    <section className="panel offline-sync-health" aria-labelledby="sync-health-title">
      <div className="panel-title">
        <div>
          <p className="eyebrow">SYNC CENTRE</p>
          <h2 id="sync-health-title">{online ? "Automatic sync is active" : "Waiting for internet"}</h2>
          <p className="muted">Each change keeps its original Trip, currency and sharing choice. Successful reconnection refreshes Home, Plan and Settlement silently.</p>
        </div>
        <span className={blocked ? "sync-health-badge warning" : online ? "sync-health-badge good" : "sync-health-badge"}>
          {blocked ? `${blocked} review` : online ? "Online" : "Offline"}
        </span>
      </div>

      <div className="sync-health-stats">
        <article><strong>{queue.length}</strong><span>Waiting</span></article>
        <article><strong>{blocked}</strong><span>Needs review</span></article>
        <article><strong>{history.length}</strong><span>Recently synced</span></article>
      </div>

      {history.length ? (
        <details className="sync-history">
          <summary>Recent successful syncs</summary>
          <div>
            {history.slice(0, 10).map((item) => (
              <article key={`${item.id}-${item.syncedAt}`}>
                <span><strong>{item.meta?.description ?? item.label}</strong><small>{item.meta?.tripName ?? "Original Trip"}{item.meta?.currency ? ` · ${item.meta.currency}` : ""}</small></span>
                <time dateTime={item.syncedAt}>{new Intl.DateTimeFormat("en-MY", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(item.syncedAt))}</time>
              </article>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}
