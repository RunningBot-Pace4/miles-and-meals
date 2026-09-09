"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { canRefreshPage, HOME_REFRESH_INTERVAL_MS } from "@/lib/live-refresh-policy";

// This refreshes server data only; link navigation remains document-based.
export function PageLiveRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  useEffect(() => {
    let lastRefresh = 0;
    function refresh() {
      const editing = Boolean(document.querySelector('dialog[open], [role="dialog"], input:focus, textarea:focus, select:focus')) || Array.from(document.querySelectorAll("form input, form textarea, form select")).some(element => {
        if (element instanceof HTMLInputElement) {
          if (element.type === "hidden" || element.type === "submit") return false;
          if (element.type === "checkbox" || element.type === "radio") return element.checked !== element.defaultChecked;
          return element.value !== element.defaultValue;
        }
        if (element instanceof HTMLTextAreaElement) return element.value !== element.defaultValue;
        if (element instanceof HTMLSelectElement) return Array.from(element.options).some(option => option.selected !== option.defaultSelected);
        return false;
      });
      if (!canRefreshPage({ online: navigator.onLine, visible: document.visibilityState === "visible", busy: pendingRef.current || document.body.dataset.actionLoading === "true", editing }) || Date.now() - lastRefresh < 2000) return;
      lastRefresh = Date.now();
      startTransition(() => router.refresh());
    }
    const timer = window.setInterval(refresh, HOME_REFRESH_INTERVAL_MS);
    const events = ["online", "focus", "mnm:expense-updated", "mnm:settlement-updated", "mnm:budget-updated", "mnm:data-synced"];
    events.forEach(event => window.addEventListener(event, refresh));
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(timer); events.forEach(event => window.removeEventListener(event, refresh)); document.removeEventListener("visibilitychange", refresh); };
  }, [router]);
  return null;
}
