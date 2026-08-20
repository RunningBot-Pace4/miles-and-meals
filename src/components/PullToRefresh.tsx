"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

const TRIGGER_DISTANCE = 74;
const MAX_DISTANCE = 118;

type PullState =
  | "IDLE"
  | "PULLING"
  | "READY"
  | "REFRESHING"
  | "BLOCKED";

function hasUnsavedFormChanges(): boolean {
  const forms = Array.from(
    document.querySelectorAll("form"),
  );

  return forms.some((form) => {
    const elements = Array.from(
      form.elements,
    );

    return elements.some((element) => {
      if (
        element instanceof HTMLInputElement
      ) {
        if (
          element.type === "checkbox" ||
          element.type === "radio"
        ) {
          return (
            element.checked !==
            element.defaultChecked
          );
        }

        if (
          element.type === "file"
        ) {
          return (
            element.files !== null &&
            element.files.length > 0
          );
        }

        return element.value !== element.defaultValue;
      }

      if (
        element instanceof HTMLTextAreaElement
      ) {
        return element.value !== element.defaultValue;
      }

      if (
        element instanceof HTMLSelectElement
      ) {
        return Array.from(element.options).some(
          (option) =>
            option.selected !==
            option.defaultSelected,
        );
      }

      return false;
    });
  });
}

function shouldIgnoreTarget(
  target: EventTarget | null,
): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest(
      [
        "input",
        "textarea",
        "select",
        "button",
        "[contenteditable='true']",
        "[data-pull-refresh-ignore='true']",
      ].join(","),
    ),
  );
}

export function PullToRefresh() {
  const startYRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const distanceRef = useRef(0);
  const refreshingRef = useRef(false);
  const [distance, setDistance] = useState(0);
  const [state, setState] =
    useState<PullState>("IDLE");

  useEffect(() => {
    function reset() {
      startYRef.current = null;
      activeRef.current = false;
      distanceRef.current = 0;

      if (!refreshingRef.current) {
        setDistance(0);
        setState("IDLE");
      }
    }

    function touchStart(event: TouchEvent) {
      if (
        event.touches.length !== 1 ||
        window.scrollY > 0 ||
        document.documentElement.scrollTop > 0 ||
        document.body.dataset.actionLoading === "true" ||
        shouldIgnoreTarget(event.target)
      ) {
        reset();
        return;
      }

      startYRef.current =
        event.touches[0]?.clientY ?? null;
      activeRef.current =
        startYRef.current !== null;
    }

    function touchMove(event: TouchEvent) {
      if (
        !activeRef.current ||
        startYRef.current === null ||
        event.touches.length !== 1
      ) {
        return;
      }

      const currentY =
        event.touches[0]?.clientY ??
        startYRef.current;
      const rawDistance =
        currentY - startYRef.current;

      if (rawDistance <= 0) {
        reset();
        return;
      }

      if (
        window.scrollY > 0 ||
        document.documentElement.scrollTop > 0
      ) {
        reset();
        return;
      }

      event.preventDefault();

      const resisted =
        Math.min(
          MAX_DISTANCE,
          rawDistance * 0.58,
        );

      distanceRef.current = resisted;
      setDistance(resisted);
      setState(
        resisted >= TRIGGER_DISTANCE
          ? "READY"
          : "PULLING",
      );
    }

    function touchEnd() {
      if (!activeRef.current) {
        reset();
        return;
      }

      const shouldRefresh =
        distanceRef.current >=
        TRIGGER_DISTANCE;

      startYRef.current = null;
      activeRef.current = false;

      if (!shouldRefresh) {
        setDistance(0);
        setState("IDLE");
        return;
      }

      if (!navigator.onLine) {
        setState("BLOCKED");
        setDistance(0);

        window.dispatchEvent(
          new CustomEvent(
            "mnm:network-message",
            {
              detail: {
                type: "offline",
                message:
                  "You’re offline. Pull-to-refresh needs a connection.",
              },
            },
          ),
        );

        window.setTimeout(
          () => setState("IDLE"),
          1200,
        );
        return;
      }

      if (hasUnsavedFormChanges()) {
        setState("BLOCKED");
        setDistance(0);

        window.dispatchEvent(
          new CustomEvent(
            "mnm:network-message",
            {
              detail: {
                type: "warning",
                message:
                  "Finish or clear your unsaved form changes before refreshing.",
              },
            },
          ),
        );

        window.setTimeout(
          () => setState("IDLE"),
          1600,
        );
        return;
      }

      refreshingRef.current = true;
      setState("REFRESHING");
      setDistance(TRIGGER_DISTANCE);
      document.body.dataset.actionLoading =
        "true";

      window.setTimeout(() => {
        window.location.reload();
      }, 280);
    }

    document.addEventListener(
      "touchstart",
      touchStart,
      {
        passive: true,
      },
    );
    document.addEventListener(
      "touchmove",
      touchMove,
      {
        passive: false,
      },
    );
    document.addEventListener(
      "touchend",
      touchEnd,
      {
        passive: true,
      },
    );
    document.addEventListener(
      "touchcancel",
      reset,
      {
        passive: true,
      },
    );

    return () => {
      document.removeEventListener(
        "touchstart",
        touchStart,
      );
      document.removeEventListener(
        "touchmove",
        touchMove,
      );
      document.removeEventListener(
        "touchend",
        touchEnd,
      );
      document.removeEventListener(
        "touchcancel",
        reset,
      );
    };
  }, []);

  const visible =
    state !== "IDLE";

  return (
    <div
      className={[
        "pull-refresh-indicator",
        visible ? "visible" : "",
        state.toLowerCase(),
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        transform: `translate(-50%, ${Math.max(
          0,
          distance - 54,
        )}px)`,
      }}
      aria-hidden={!visible}
      role="status"
    >
      <span
        className="pull-refresh-icon"
        aria-hidden="true"
      >
        {state === "REFRESHING"
          ? "↻"
          : state === "READY"
            ? "↑"
            : state === "BLOCKED"
              ? "!"
              : "↓"}
      </span>
      <strong>
        {state === "READY"
          ? "Release to refresh"
          : state === "REFRESHING"
            ? "Refreshing…"
            : state === "BLOCKED"
              ? "Refresh paused"
              : "Pull to refresh"}
      </strong>
    </div>
  );
}
