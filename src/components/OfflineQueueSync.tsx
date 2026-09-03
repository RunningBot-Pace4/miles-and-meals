"use client";

import { useEffect, useMemo, useState } from "react";
import {
  editOfflineMutation,
  flushOfflineQueue,
  readOfflineQueue,
  readOfflineSyncHistory,
  removeOfflineMutation,
  retryOfflineMutation,
  type OfflineMutation,
} from "@/lib/offline-queue";

type QueueEditDraft = {
  description: string;
  expenseDate: string;
  transactionAmount: string;
  category: string;
  title: string;
  itemDate: string;
  itemTime: string;
  area: string;
};

function canonicalExpenseCategory(value: string) {
  return ({ Accommodation: "Hotel", Activities: "Attractions", Meals: "Food", Travel: "Transport" } as Record<string, string>)[value] ?? value;
}

const EMPTY_EDIT: QueueEditDraft = {
  description: "", expenseDate: "", transactionAmount: "", category: "Other",
  title: "", itemDate: "", itemTime: "", area: "",
};

function bodyRecord(item: OfflineMutation): Record<string, unknown> {
  return item.body && typeof item.body === "object" && !Array.isArray(item.body)
    ? item.body as Record<string, unknown>
    : {};
}

function editableKind(item: OfflineMutation): "expense" | "plan" | null {
  if (item.method === "POST" && item.url === "/api/expenses") return "expense";
  if (item.method === "POST" && item.url === "/api/travel-items") return "plan";
  return null;
}

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
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<QueueEditDraft>(EMPTY_EDIT);
  const [editMessage, setEditMessage] = useState("");

  const blocked = useMemo(
    () => items.filter((item) => item.blocked).length,
    [items],
  );

  useEffect(() => {
    let disposed = false;

    function refreshItems() {
      if (!disposed) {
        setItems(readOfflineQueue());
        setLastSyncedAt(readOfflineSyncHistory()[0]?.syncedAt ?? null);
      }
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

    const initialItems = readOfflineQueue();
    refreshItems();
    // A page load immediately after connectivity returns must not inherit a
    // future backoff timestamp from the failed offline request.
    if (initialItems.length > 0) {
      void sync(navigator.onLine);
    }

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
    window.addEventListener("mnm:offline-sync-history-changed", onQueueChanged);
    document.addEventListener("visibilitychange", onVisible);

    const timer = window.setInterval(() => {
      if (readOfflineQueue().length > 0) void sync();
    }, 60_000);

    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("mnm:offline-queue-changed", onQueueChanged);
      window.removeEventListener("mnm:offline-sync-history-changed", onQueueChanged);
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

  function startEdit(item: OfflineMutation) {
    const body = bodyRecord(item);
    setEditingId(item.id);
    setEditMessage("");
    setEditDraft({
      description: String(body.description ?? ""),
      expenseDate: String(body.expenseDate ?? ""),
      transactionAmount: String(body.transactionAmount ?? ""),
      category: canonicalExpenseCategory(String(body.category ?? "Other")),
      title: String(body.title ?? ""),
      itemDate: String(body.itemDate ?? ""),
      itemTime: String(body.itemTime ?? ""),
      area: String(body.area ?? ""),
    });
  }

  function saveEdit(item: OfflineMutation) {
    const kind = editableKind(item);
    if (!kind) return;
    if (kind === "expense") {
      const numericAmount = Number(editDraft.transactionAmount);
      if (!editDraft.description.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
        setEditMessage("Enter a description and valid amount.");
        return;
      }
      editOfflineMutation(item.id, {
        description: editDraft.description,
        expenseDate: editDraft.expenseDate,
        transactionAmount: numericAmount,
        category: editDraft.category,
      });
    } else {
      if (!editDraft.title.trim()) {
        setEditMessage("Enter a title for this Plan item.");
        return;
      }
      editOfflineMutation(item.id, {
        title: editDraft.title,
        itemDate: editDraft.itemDate,
        itemTime: editDraft.itemTime,
        area: editDraft.area,
      });
    }
    setItems(readOfflineQueue());
    setEditingId(null);
    setEditMessage("");
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
          aria-label="Sync centre"
          aria-live="polite"
        >
          <div className="offline-queue-sheet-head">
            <div>
              <strong>Sync centre</strong>
              <small>
                {blocked > 0
                  ? `${blocked} change${blocked === 1 ? "" : "s"} needs your review.`
                  : "Stored safely on this device until sync completes."}
              </small>
              {lastSyncedAt ? (
                <small>Last successful sync {new Intl.DateTimeFormat("en-MY", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(lastSyncedAt))}</small>
              ) : null}
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
                <div className="offline-queue-item-content">
                  <strong>{item.label}</strong>
                  {item.meta ? (
                    <span className="offline-queue-context">
                      Original Trip · {[
                        item.meta.tripName,
                        item.meta.currency,
                        item.meta.sharing,
                      ].filter(Boolean).join(" · ")}
                    </span>
                  ) : null}
                  {item.meta?.description ? <small>{item.meta.description}</small> : null}
                  <small>{item.lastError ?? retryText(item)}</small>
                  <small>
                    Saved {new Intl.DateTimeFormat("en-MY", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(item.createdAt))}
                  </small>
                  {item.lastAttemptAt && !item.blocked ? (
                    <small className="offline-queue-attempt-meta">
                      Attempt {item.attempts ?? 0} · last tried {new Intl.DateTimeFormat("en-MY", {
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(item.lastAttemptAt))}
                    </small>
                  ) : null}
                  {editingId === item.id ? (
                    <div className="offline-queue-editor">
                      {editableKind(item) === "expense" ? <>
                        <label>Description<input value={editDraft.description} onChange={(event) => setEditDraft({ ...editDraft, description: event.target.value })} /></label>
                        <div className="offline-queue-editor-grid">
                          <label>Amount<input inputMode="decimal" data-numeric-input="decimal" value={editDraft.transactionAmount} onChange={(event) => setEditDraft({ ...editDraft, transactionAmount: event.target.value })} /></label>
                          <label>Date<input type="date" value={editDraft.expenseDate} onChange={(event) => setEditDraft({ ...editDraft, expenseDate: event.target.value })} /></label>
                          <label>Category<select value={editDraft.category} onChange={(event) => setEditDraft({ ...editDraft, category: event.target.value })}><option>Food</option><option>Transport</option><option>Hotel</option><option>Shopping</option><option>Attractions</option><option>Flights</option><option>Other</option></select></label>
                        </div>
                      </> : <>
                        <label>Title<input value={editDraft.title} onChange={(event) => setEditDraft({ ...editDraft, title: event.target.value })} /></label>
                        <div className="offline-queue-editor-grid">
                          <label>Date<input type="date" value={editDraft.itemDate} onChange={(event) => setEditDraft({ ...editDraft, itemDate: event.target.value })} /></label>
                          <label>Time<input type="time" value={editDraft.itemTime} onChange={(event) => setEditDraft({ ...editDraft, itemTime: event.target.value })} /></label>
                          <label>Area<input value={editDraft.area} onChange={(event) => setEditDraft({ ...editDraft, area: event.target.value })} /></label>
                        </div>
                      </>}
                      <small>Original Trip, currency, payer and sharing cannot be changed.</small>
                      {editMessage ? <small className="field-error">{editMessage}</small> : null}
                      <div className="offline-queue-editor-actions"><button type="button" onClick={() => saveEdit(item)}>Save correction</button><button type="button" onClick={() => { setEditingId(null); setEditMessage(""); }}>Cancel</button></div>
                    </div>
                  ) : null}
                </div>

                <div className="offline-queue-item-actions">
                  {editableKind(item) && editingId !== item.id ? <button type="button" onClick={() => startEdit(item)}>Edit</button> : null}
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
