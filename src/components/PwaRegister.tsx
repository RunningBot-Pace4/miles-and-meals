"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

type NavigatorWithStandalone =
  Navigator & {
    standalone?: boolean;
  };

const UPDATE_READY_TIMEOUT_MS = 8_000;
const UPDATE_RELOAD_TIMEOUT_MS = 8_000;

async function waitForWaitingWorker(
  registration: ServiceWorkerRegistration,
): Promise<ServiceWorker | null> {
  const immediate = registration.waiting;
  if (immediate) return immediate;

  await registration.update();
  const deadline = Date.now() + UPDATE_READY_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (registration.waiting) return registration.waiting;
    await new Promise((resolve) => window.setTimeout(resolve, 160));
  }

  return registration.waiting;
}

function isInstalledMobileApp(): boolean {
  const standalone =
    window.matchMedia(
      "(display-mode: standalone)",
    ).matches ||
    Boolean(
      (
        navigator as NavigatorWithStandalone
      ).standalone,
    );

  if (!standalone) {
    return false;
  }

  return (
    window.matchMedia(
      "(pointer: coarse)",
    ).matches ||
    window.matchMedia(
      "(max-width: 820px)",
    ).matches
  );
}

export function PwaRegister() {
  const registrationRef =
    useRef<ServiceWorkerRegistration | null>(
      null,
    );
  const [updateAvailable, setUpdateAvailable] =
    useState(false);
  const activationTimerRef = useRef<number | null>(null);
  const [updateState, setUpdateState] =
    useState<"idle" | "updating" | "failed">("idle");

  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    let disposed = false;
    let refreshing = false;

    function showUpdateIfAppropriate() {
      setUpdateAvailable(
        isInstalledMobileApp(),
      );
    }

    function watchRegistration(
      registration: ServiceWorkerRegistration,
    ) {
      registrationRef.current =
        registration;

      if (registration.waiting) {
        showUpdateIfAppropriate();
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
                worker.state ===
                  "installed" &&
                navigator.serviceWorker
                  .controller
              ) {
                showUpdateIfAppropriate();
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

        watchRegistration(
          registration,
        );
        void registration.update();
      } catch {
        // Online web use still works if service-worker setup is unavailable.
      }
    }

    function controllerChanged() {
      if (refreshing) {
        return;
      }

      refreshing = true;
      if (activationTimerRef.current !== null) {
        window.clearTimeout(activationTimerRef.current);
        activationTimerRef.current = null;
      }
      setUpdateAvailable(false);
      window.location.reload();
    }

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      controllerChanged,
    );

    if (
      document.readyState === "complete"
    ) {
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
      if (activationTimerRef.current !== null) {
        window.clearTimeout(activationTimerRef.current);
        activationTimerRef.current = null;
      }
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
        document.visibilityState ===
          "visible" &&
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

  async function installUpdate() {
    const registration = registrationRef.current;
    if (!registration || updateState === "updating") return;

    setUpdateState("updating");

    try {
      const waiting = await waitForWaitingWorker(registration);
      if (!waiting) throw new Error("Update worker did not become ready");

      activationTimerRef.current = window.setTimeout(() => {
        // iOS installed PWAs do not always dispatch controllerchange. A safe
        // reload lets the newly activated worker take control and never leaves
        // the button stuck indefinitely.
        window.location.reload();
      }, UPDATE_RELOAD_TIMEOUT_MS);

      waiting.postMessage({ type: "SKIP_WAITING" });
    } catch {
      if (activationTimerRef.current !== null) {
        window.clearTimeout(activationTimerRef.current);
        activationTimerRef.current = null;
      }
      setUpdateState("failed");
    }
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
          {updateState === "failed"
            ? "The update did not finish. Your current version is still safe to use."
            : "Install the latest version without reinstalling the Home Screen app."}
        </small>
      </div>

      <button
        type="button"
        className="button primary"
        onClick={() => void installUpdate()}
        disabled={updateState === "updating"}
      >
        {updateState === "updating"
          ? "Updating…"
          : updateState === "failed"
            ? "Retry"
            : "Update"}
      </button>
    </div>
  ) : null;
}
