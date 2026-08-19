"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function SettlementLiveRefresh({
  intervalMs = 4000,
  showBadge = true,
}: {
  intervalMs?: number;
  showBadge?: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    function refresh() {
      if (
        document.visibilityState !== "visible" ||
        document.body.dataset.actionLoading === "true"
      ) {
        return;
      }

      router.refresh();
    }

    const timer = window.setInterval(refresh, intervalMs);

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        refresh();
      }
    }

    window.addEventListener("focus", refresh);
    document.addEventListener(
      "visibilitychange",
      refreshWhenVisible,
    );

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener(
        "visibilitychange",
        refreshWhenVisible,
      );
    };
  }, [intervalMs, router]);

  if (!showBadge) {
    return null;
  }

  return (
    <span
      className="settlement-live-badge"
      title="Settlement status refreshes automatically while this page is open."
    >
      <i aria-hidden="true" />
      Live updates
    </span>
  );
}
