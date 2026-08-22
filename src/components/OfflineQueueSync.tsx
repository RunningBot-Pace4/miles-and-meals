"use client";

import { useEffect, useState } from "react";
import { flushOfflineQueue, readOfflineQueue } from "@/lib/offline-queue";

export function OfflineQueueSync() {
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let disposed = false;

    function refreshCount() {
      if (!disposed) {
        setPending(readOfflineQueue().length);
      }
    }

    async function sync() {
      if (!navigator.onLine) {
        refreshCount();
        return;
      }

      const result = await flushOfflineQueue();

      if (disposed) {
        return;
      }

      setPending(result.remaining);

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

    refreshCount();
    void sync();

    function onVisible() {
      if (document.visibilityState === "visible") {
        void sync();
      }
    }

    window.addEventListener("online", sync);
    window.addEventListener("focus", sync);
    window.addEventListener("mnm:offline-queue-changed", refreshCount);
    document.addEventListener("visibilitychange", onVisible);

    const timer = window.setInterval(() => void sync(), 30_000);

    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener("online", sync);
      window.removeEventListener("focus", sync);
      window.removeEventListener("mnm:offline-queue-changed", refreshCount);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (pending === 0) {
    return null;
  }

  return (
    <div className="offline-queue-pill" role="status" aria-live="polite">
      <span aria-hidden="true">↻</span>
      <strong>{pending}</strong>
      <small>waiting to sync</small>
    </div>
  );
}
