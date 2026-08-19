"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    async function register() {
      try {
        const registration =
          await navigator.serviceWorker.register(
            "/sw.js",
            {
              scope: "/",
              updateViaCache: "none",
            },
          );

        void registration.update();
      } catch {
        // The app remains usable online if service-worker registration fails.
      }
    }

    if (document.readyState === "complete") {
      void register();
      return;
    }

    function onLoad() {
      void register();
    }

    window.addEventListener("load", onLoad, {
      once: true,
    });

    return () => {
      window.removeEventListener("load", onLoad);
    };
  }, []);

  return null;
}
