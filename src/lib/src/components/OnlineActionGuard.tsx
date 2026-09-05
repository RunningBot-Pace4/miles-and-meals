"use client";

import { useEffect } from "react";

export function OnlineActionGuard() {
  useEffect(() => {
    function notify() {
      window.dispatchEvent(
        new CustomEvent(
          "mnm:network-message",
          {
            detail: {
              type: "offline",
              message:
                "This change needs a connection. Reconnect and try again.",
            },
          },
        ),
      );
    }

    function guardSubmit(
      event: SubmitEvent,
    ) {
      if (navigator.onLine) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      notify();
    }

    function guardClick(
      event: MouseEvent,
    ) {
      if (navigator.onLine) {
        return;
      }

      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const action = target.closest(
        "[data-requires-online='true']",
      );

      if (!action) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      notify();
    }

    document.addEventListener(
      "submit",
      guardSubmit,
      true,
    );
    document.addEventListener(
      "click",
      guardClick,
      true,
    );

    return () => {
      document.removeEventListener(
        "submit",
        guardSubmit,
        true,
      );
      document.removeEventListener(
        "click",
        guardClick,
        true,
      );
    };
  }, []);

  return null;
}
