"use client";

import { useEffect } from "react";
import {
  isAllowedNumericInsertion,
  sanitizePositiveDecimalInput,
} from "@/lib/numeric-input";

function isNumericField(
  target: EventTarget | null,
): target is HTMLInputElement {
  return (
    target instanceof
      HTMLInputElement &&
    (
      target.dataset.numericInput ===
        "decimal" ||
      target.inputMode ===
        "decimal" ||
      target.inputMode ===
        "numeric"
    )
  );
}

export function NumericInputGuard() {
  useEffect(() => {
    function beforeInput(
      event: InputEvent,
    ) {
      if (
        !isNumericField(
          event.target,
        ) ||
        event.inputType.startsWith(
          "delete",
        ) ||
        event.data === null
      ) {
        return;
      }

      if (
        !isAllowedNumericInsertion(
          event.data,
        )
      ) {
        event.preventDefault();
      }
    }

    function sanitizeInput(
      event: Event,
    ) {
      if (
        !isNumericField(
          event.target,
        )
      ) {
        return;
      }

      const input =
        event.target;
      const sanitized =
        sanitizePositiveDecimalInput(
          input.value,
        );

      if (
        sanitized ===
        input.value
      ) {
        return;
      }

      const cursor =
        input.selectionStart;
      const removedBeforeCursor =
        cursor === null
          ? 0
          : input.value
              .slice(0, cursor)
              .length -
            sanitizePositiveDecimalInput(
              input.value.slice(
                0,
                cursor,
              ),
            ).length;

      input.value =
        sanitized;

      if (
        cursor !== null &&
        (
          input.type === "text" ||
          input.type === "search" ||
          input.type === "tel" ||
          input.type === "url"
        )
      ) {
        const nextCursor =
          Math.max(
            0,
            cursor -
              removedBeforeCursor,
          );

        input.setSelectionRange(
          nextCursor,
          nextCursor,
        );
      }
    }

    document.addEventListener(
      "beforeinput",
      beforeInput as EventListener,
      true,
    );
    document.addEventListener(
      "input",
      sanitizeInput,
      true,
    );

    return () => {
      document.removeEventListener(
        "beforeinput",
        beforeInput as EventListener,
        true,
      );
      document.removeEventListener(
        "input",
        sanitizeInput,
        true,
      );
    };
  }, []);

  return null;
}
