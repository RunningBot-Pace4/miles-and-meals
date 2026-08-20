"use client";

import { useEffect } from "react";

const MAX_REPORTS_PER_PAGE = 5;

export function ClientErrorReporter() {
  useEffect(() => {
    let reports = 0;

    async function report(
      message: string,
      stack?: string,
    ) {
      if (
        reports >= MAX_REPORTS_PER_PAGE ||
        !navigator.onLine
      ) {
        return;
      }

      reports += 1;

      try {
        await fetch("/api/errors", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          keepalive: true,
          body: JSON.stringify({
            route:
              window.location.pathname +
              window.location.search,
            message,
            stack,
          }),
        });
      } catch {
        // Error reporting must never create another user-facing error.
      }
    }

    function onError(event: ErrorEvent) {
      void report(
        event.message || "Client error",
        event.error instanceof Error
          ? event.error.stack
          : undefined,
      );
    }

    function onUnhandledRejection(
      event: PromiseRejectionEvent,
    ) {
      const reason = event.reason;

      if (reason instanceof Error) {
        void report(
          reason.message,
          reason.stack,
        );
        return;
      }

      void report(
        typeof reason === "string"
          ? reason
          : "Unhandled promise rejection",
      );
    }

    window.addEventListener(
      "error",
      onError,
    );
    window.addEventListener(
      "unhandledrejection",
      onUnhandledRejection,
    );

    return () => {
      window.removeEventListener(
        "error",
        onError,
      );
      window.removeEventListener(
        "unhandledrejection",
        onUnhandledRejection,
      );
    };
  }, []);

  return null;
}
