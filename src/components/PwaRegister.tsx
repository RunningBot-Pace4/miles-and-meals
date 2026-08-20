"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

export function PwaRegister() {
  const registrationRef =
    useRef<ServiceWorkerRegistration | null>(
      null,
    );
  const [updateAvailable, setUpdateAvailable] =
    useState(false);
  const [updating, setUpdating] =
    useState(false);

  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    let disposed = false;
    let refreshing = false;

    function watchRegistration(
      registration: ServiceWorkerRegistration,
    ) {
      registrationRef.current = registration;

      if (registration.waiting) {
        setUpdateAvailable(true);
      }

      registration.addEventListener(
        "updatefound",
        () => {
          const worker =
            registration.installing;

          if (!worker) {
            return;
          }

          worker.addEventListener(
            "statechange",
            () => {
              if (
                worker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                setUpdateAvailable(true);
              }
            },
          );
        },
      );
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

        if (disposed) {
          return;
        }

        watchRegistration(registration);
        void registration.update();
      } catch {
        // Miles & Meals remains usable online without service-worker registration.
      }
    }

    function controllerChanged() {
      if (refreshing) {
        return;
      }

      refreshing = true;
      window.location.reload();
    }

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      controllerChanged,
    );

    if (document.readyState === "complete") {
      void register();
    } else {
      window.addEventListener(
        "load",
        register,
        {
          once: true,
        },
      );
    }

    return () => {
      disposed = true;
      window.removeEventListener(
        "load",
        register,
      );
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        controllerChanged,
      );
    };
  }, []);

  useEffect(() => {
    const badgeNavigator =
      navigator as Navigator & {
        clearAppBadge?: () => Promise<void>;
      };

    function clearBadge() {
      if (
        document.visibilityState === "visible" &&
        badgeNavigator.clearAppBadge
      ) {
        void badgeNavigator
          .clearAppBadge()
          .catch(() => undefined);
      }
    }

    clearBadge();
    window.addEventListener(
      "focus",
      clearBadge,
    );
    document.addEventListener(
      "visibilitychange",
      clearBadge,
    );

    return () => {
      window.removeEventListener(
        "focus",
        clearBadge,
      );
      document.removeEventListener(
        "visibilitychange",
        clearBadge,
      );
    };
  }, []);

  function installUpdate() {
    const waiting =
      registrationRef.current?.waiting;

    if (!waiting) {
      void registrationRef.current
        ?.update()
        .then(() => {
          const next =
            registrationRef.current?.waiting;

          if (next) {
            setUpdating(true);
            next.postMessage({
              type: "SKIP_WAITING",
            });
          }
        });
      return;
    }

    setUpdating(true);
    waiting.postMessage({
      type: "SKIP_WAITING",
    });
  }

  return updateAvailable ? (
    <div
      className="pwa-update-banner"
      role="status"
      aria-live="polite"
    >
      <span
        className="pwa-update-icon"
        aria-hidden="true"
      >
        ↻
      </span>
      <div>
        <strong>
          Miles &amp; Meals update ready
        </strong>
        <small>
          Install the latest version without
          reinstalling the Home Screen app.
        </small>
      </div>
      <button
        type="button"
        className="button primary"
        onClick={installUpdate}
        disabled={updating}
      >
        {updating ? "Updating…" : "Update"}
      </button>
    </div>
  ) : null;
}
