"use client";

import { useEffect } from "react";

const MINIMUM_SPLASH_MS = 520;
const DISMISS_ANIMATION_MS = 260;

export function PwaLaunchDismiss() {
  useEffect(() => {
    const splash = document.getElementById(
      "pwa-launch-screen",
    );

    if (!splash) {
      return;
    }

    const launchScreen: HTMLElement = splash;
    const startedAt = performance.now();

    let dismissTimer: number | null = null;
    let removeTimer: number | null = null;

    function dismiss() {
      const elapsed = performance.now() - startedAt;
      const remaining = Math.max(
        0,
        MINIMUM_SPLASH_MS - elapsed,
      );

      dismissTimer = window.setTimeout(() => {
        launchScreen.classList.add("dismissed");

        removeTimer = window.setTimeout(() => {
          launchScreen.remove();
        }, DISMISS_ANIMATION_MS);
      }, remaining);
    }

    if (document.readyState === "complete") {
      dismiss();
    } else {
      window.addEventListener("load", dismiss, {
        once: true,
      });
    }

    return () => {
      window.removeEventListener("load", dismiss);

      if (dismissTimer !== null) {
        window.clearTimeout(dismissTimer);
      }

      if (removeTimer !== null) {
        window.clearTimeout(removeTimer);
      }
    };
  }, []);

  return null;
}
