"use client";

import {
  useEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { BrandedLoadingScreen } from "@/components/BrandedLoadingScreen";

export function SavingOverlay({
  title = "Updating your trip",
  message = "Saving changes and keeping everyone in sync.",
}: {
  title?: string;
  message?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const previousHtmlOverflow =
      document.documentElement.style.overflow;
    const previousBodyOverflow =
      document.body.style.overflow;
    const previousLoadingState =
      document.body.dataset.actionLoading;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.dataset.actionLoading = "true";

    return () => {
      document.documentElement.style.overflow =
        previousHtmlOverflow;
      document.body.style.overflow =
        previousBodyOverflow;

      if (previousLoadingState === undefined) {
        delete document.body.dataset.actionLoading;
      } else {
        document.body.dataset.actionLoading =
          previousLoadingState;
      }
    };
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <BrandedLoadingScreen
      title={title}
      message={message}
    />,
    document.body,
  );
}
