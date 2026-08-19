"use client";

import { useEffect } from "react";

function isSameOriginNavigation(
  anchor: HTMLAnchorElement,
): boolean {
  if (
    anchor.target === "_blank" ||
    anchor.hasAttribute("download")
  ) {
    return false;
  }

  const href = anchor.getAttribute("href");

  if (
    !href ||
    href.startsWith("#") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  ) {
    return false;
  }

  const url = new URL(anchor.href, window.location.href);

  return url.origin === window.location.origin;
}

export function OfflineNavigationGuard() {
  useEffect(() => {
    function guardNavigation(event: MouseEvent) {
      if (
        navigator.onLine ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a");

      if (
        !(anchor instanceof HTMLAnchorElement) ||
        !isSameOriginNavigation(anchor)
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      window.location.assign("/offline.html");
    }

    document.addEventListener(
      "click",
      guardNavigation,
      true,
    );

    return () => {
      document.removeEventListener(
        "click",
        guardNavigation,
        true,
      );
    };
  }, []);

  return null;
}
