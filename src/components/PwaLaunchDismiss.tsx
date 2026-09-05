"use client";

import { useEffect } from "react";

const MINIMUM_SPLASH_MS = 240;
const DISMISS_ANIMATION_MS = 140;

export function PwaLaunchDismiss() {
  useEffect(() => {
    try {
      sessionStorage.setItem(
        "mnm:pwa-launch-seen",
        "1",
      );
    } catch {
      // Session storage is optional.
    }

    const splash = document.getElementById(
      "pwa-launch-screen",
    );

    if (!splash) {
      return;
    }

    const launchScreen: HTMLElement = splash;

    let dismissTimer: number | null = null;
    let removeTimer: number | null = null;
    let dismissFrame: number | null = null;

    function dismiss() {
      // performance.now() is time since navigation began. Measuring from that
      // point avoids adding a second artificial pause after React hydrates.
      const elapsed = performance.now();
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

    // This component can only run once the app is hydrated and interactive.
    // Waiting for every image/font load made the PWA feel stalled and exposed
    // a second route loader underneath the launch screen.
    dismissFrame = window.requestAnimationFrame(dismiss);

    return () => {
      if (dismissFrame !== null) {
        window.cancelAnimationFrame(dismissFrame);
      }

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
