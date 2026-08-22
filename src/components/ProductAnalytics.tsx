"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackProductEvent } from "@/lib/product-analytics-client";

function runtimeContext(): "web" | "pwa" | "mobile" | "desktop" {
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

  if (standalone) {
    return "pwa";
  }

  return window.matchMedia?.("(max-width: 760px)").matches ? "mobile" : "desktop";
}

export function ProductAnalytics() {
  const pathname = usePathname();
  const lastPath = useRef("");

  useEffect(() => {
    if (!pathname || pathname === lastPath.current) {
      return;
    }

    lastPath.current = pathname;
    trackProductEvent("page_view", pathname, runtimeContext());
  }, [pathname]);

  return null;
}
