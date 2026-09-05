"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FullPageLink as Link } from "@/components/FullPageLink";

type CollaborationEvent = {
  id: string;
  action: string;
  entityType: string;
  summary: string;
  createdAt: string;
};

const POLL_MS = 60_000;
const TOAST_MS = 6500;

function destination(entityType: string): string {
  if (entityType === "EXPENSE") return "/expenses";
  if (entityType === "SETTLEMENT") return "/settlements";
  if (entityType === "PLANNER") return "/planner";
  if (entityType === "TRIP" || entityType === "COUNTRY") return "/trips";
  return "/activity";
}

function notifyWorkspace(entityType: string) {
  if (entityType === "EXPENSE") {
    window.dispatchEvent(new Event("mnm:expense-updated"));
  } else if (entityType === "SETTLEMENT") {
    window.dispatchEvent(new Event("mnm:settlement-updated"));
  } else if (entityType === "PLANNER") {
    window.dispatchEvent(new Event("mnm:planner-updated"));
  }
}

export function CollaborationPulse() {
  const cursorRef = useRef(new Date().toISOString());
  const seenRef = useRef(new Set<string>());
  const pollingRef = useRef(false);
  const [event, setEvent] = useState<CollaborationEvent | null>(null);

  const poll = useCallback(async () => {
    if (
      pollingRef.current ||
      !navigator.onLine ||
      document.visibilityState !== "visible"
    ) {
      return;
    }

    pollingRef.current = true;

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 3500);

    try {
      const response = await fetch(
        `/api/collaboration/pulse?since=${encodeURIComponent(cursorRef.current)}`,
        { cache: "no-store", signal: controller.signal },
      );

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as {
        events?: CollaborationEvent[];
        serverTime?: string;
      };

      cursorRef.current = payload.serverTime ?? new Date().toISOString();
      const fresh = (payload.events ?? []).filter((item) => !seenRef.current.has(item.id));

      for (const item of fresh) {
        seenRef.current.add(item.id);
        notifyWorkspace(item.entityType);
      }

      if (fresh.length) {
        setEvent(fresh[fresh.length - 1]);
      }

      if (seenRef.current.size > 80) {
        seenRef.current = new Set([...seenRef.current].slice(-40));
      }
    } catch {
      // Background collaboration polling must never interrupt the active page.
    } finally {
      window.clearTimeout(timer);
      pollingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => void poll(), POLL_MS);

    function visible() {
      if (document.visibilityState === "visible") {
        void poll();
      }
    }

    window.addEventListener("online", visible);
    window.addEventListener("focus", visible);
    document.addEventListener("visibilitychange", visible);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", visible);
      window.removeEventListener("focus", visible);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [poll]);

  useEffect(() => {
    if (!event) return;
    const timer = window.setTimeout(() => setEvent(null), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [event]);

  if (!event) {
    return null;
  }

  return (
    <aside className="collaboration-toast" role="status" aria-live="polite">
      <span className="collaboration-live-dot" aria-hidden="true" />
      <div>
        <small>Live trip update</small>
        <strong>{event.summary}</strong>
      </div>
      <Link href={destination(event.entityType)} onClick={() => setEvent(null)}>
        View
      </Link>
      <button type="button" aria-label="Dismiss live update" onClick={() => setEvent(null)}>
        ×
      </button>
    </aside>
  );
}
