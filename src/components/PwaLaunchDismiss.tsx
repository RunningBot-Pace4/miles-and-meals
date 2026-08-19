"use client";

import { useEffect } from "react";

const MINIMUM_SPLASH_MS = 520;

export function PwaLaunchDismiss() {
  useEffect(() => {
    const splash = document.getElementById(
      "pwa-launch-screen",
    );

    if (!splash) {
      return;
    }

    const startedAt = performance.now();

    function dismiss() {
      const elapsed = performance.now() - startedAt;
      const remaining = Math.max(
        0,
        MINIMUM_SPLASH_MS - elapsed,
      );

      window.setTimeout(() => {
        splash.classList.add("dismissed");

        window.setTimeout(() => {
          splash.remove();
        }, 260);
      }, remaining);
    }

    if (document.readyState === "complete") {
      dismiss();
      return;
    }

    window.addEventListener("load", dismiss, {
      once: true,
    });

    return () => {
      window.removeEventListener("load", dismiss);
    };
  }, []);

  return null;
}
