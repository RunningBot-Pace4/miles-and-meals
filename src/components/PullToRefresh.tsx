"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

const ACTIVATION_DISTANCE = 14;
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

        if (element.type === "file") {
          return (
            element.files !== null &&
            element.files.length > 0
          );
        }

        return (
          element.value !==
          element.defaultValue
        );
      }

      if (
        element instanceof HTMLTextAreaElement
      ) {
        return (
          element.value !==
          element.defaultValue
        );
      }

      if (
        element instanceof HTMLSelectElement
      ) {
        return Array.from(
          element.options,
        ).some(
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

  if (
    target.closest(
      [
        "input",
        "textarea",
        "select",
        "button",
        "[contenteditable='true']",
        "[data-pull-refresh-ignore='true']",
      ].join(","),
    )
  ) {
    return true;
  }

  let element: Element | null = target;

  while (
    element &&
    element !== document.body
  ) {
    if (
      element instanceof HTMLElement &&
      element.scrollHeight >
        element.clientHeight + 2
    ) {
      const overflowY =
        window.getComputedStyle(
          element,
        ).overflowY;

      if (
        overflowY === "auto" ||
        overflowY === "scroll"
      ) {
        return true;
      }
    }

    element = element.parentElement;
  }

  return false;
}

function pageIsAtTop(): boolean {
  return (
    window.scrollY <= 0 &&
    document.documentElement.scrollTop <= 0
  );
}

export function PullToRefresh() {
  const startXRef =
    useRef<number | null>(null);
  const startYRef =
    useRef<number | null>(null);
  const activeRef = useRef(false);
  const engagedRef = useRef(false);
  const distanceRef = useRef(0);
  const refreshingRef = useRef(false);

  const [distance, setDistance] =
    useState(0);
  const [state, setState] =
    useState<PullState>("IDLE");

  useEffect(() => {
    function reset() {
      startXRef.current = null;
      startYRef.current = null;
      activeRef.current = false;
      engagedRef.current = false;
      distanceRef.current = 0;

      if (!refreshingRef.current) {
        setDistance(0);
        setState("IDLE");
      }
    }

    function touchStart(
      event: TouchEvent,
    ) {
      if (
        event.touches.length !== 1 ||
        !pageIsAtTop() ||
        document.body.dataset
          .actionLoading === "true" ||
        shouldIgnoreTarget(event.target)
      ) {
        reset();
        return;
      }

      const touch = event.touches[0];

      if (!touch) {
        reset();
        return;
      }

      startXRef.current = touch.clientX;
      startYRef.current = touch.clientY;
      activeRef.current = true;
      engagedRef.current = false;
    }

    function touchMove(
      event: TouchEvent,
    ) {
      if (
        !activeRef.current ||
        startXRef.current === null ||
        startYRef.current === null ||
        event.touches.length !== 1
      ) {
        return;
      }

      const touch = event.touches[0];

      if (!touch) {
        return;
      }

      const deltaX =
        touch.clientX - startXRef.current;
      const deltaY =
        touch.clientY - startYRef.current;

      if (
        Math.abs(deltaX) >
          Math.abs(deltaY) &&
        Math.abs(deltaX) >
          ACTIVATION_DISTANCE
      ) {
        reset();
        return;
      }

      if (deltaY <= 0) {
        reset();
        return;
      }

      if (!pageIsAtTop()) {
        reset();
        return;
      }

      if (
        !engagedRef.current &&
        deltaY < ACTIVATION_DISTANCE
      ) {
        return;
      }

      engagedRef.current = true;

      if (event.cancelable) {
        event.preventDefault();
      }

      const resisted = Math.min(
        MAX_DISTANCE,
        (
          deltaY -
          ACTIVATION_DISTANCE
        ) * 0.58,
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
      if (
        !activeRef.current ||
        !engagedRef.current
      ) {
        reset();
        return;
      }

      const shouldRefresh =
        distanceRef.current >=
        TRIGGER_DISTANCE;

      startXRef.current = null;
      startYRef.current = null;
      activeRef.current = false;
      engagedRef.current = false;

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

      window.setTimeout(() => {
        window.location.reload();
      }, 240);
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

  const visible = state !== "IDLE";

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
