"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { canRefreshPage, SAVED_PAGE_REFRESH_DELAY_MS } from "@/lib/live-refresh-policy";

// Server pages refresh only after this tab confirms a successful save. Idle,
// focus and online events must never replace a healthy page with a transient
// server-rendering error; live sections use their fault-tolerant API polling.
export function PageLiveRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  useEffect(() => {
    function refreshAfterSave() {
      if (!canRefreshPage({ online: navigator.onLine, visible: document.visibilityState === "visible", busy: pendingRef.current || document.body.dataset.actionLoading === "true", editing: false })) return;
      startTransition(() => router.refresh());
    }
    const events = ["mnm:expense-updated", "mnm:settlement-updated", "mnm:budget-updated"];
    let savedTimer: ReturnType<typeof setTimeout> | undefined;
    const handleEvent = (event: Event) => {
      const saved = event instanceof CustomEvent && event.detail?.saved === true;
      if (!saved) return;
      clearTimeout(savedTimer);
      savedTimer = setTimeout(refreshAfterSave, SAVED_PAGE_REFRESH_DELAY_MS);
    };
    events.forEach(event => window.addEventListener(event, handleEvent));
    return () => { clearTimeout(savedTimer); events.forEach(event => window.removeEventListener(event, handleEvent)); };
  }, [router]);
  return null;
}
