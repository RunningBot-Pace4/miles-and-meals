"use client";

import { BrandedLoadingScreen } from "@/components/BrandedLoadingScreen";
import type {
  AnchorHTMLAttributes,
  MouseEvent,
  PointerEvent,
  ReactNode,
} from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const NAVIGATION_INDICATOR_TIMEOUT_MS = 12_000;

type FullPageLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
> & {
  href: string;
  children: ReactNode;
  prefetch?: boolean;
};

export function FullPageLink({
  href,
  children,
  onClick,
  onPointerCancel,
  onPointerDown,
  prefetch = false,
  ...props
}: FullPageLinkProps) {
  const [navigationPending, setNavigationPending] = useState(false);
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalHost(document.body);
  }, []);

  useEffect(() => {
    if (!navigationPending) return;

    // A browser extension or a native beforeunload prompt can cancel a normal
    // document navigation. Clear only the indicator; never start a second
    // navigation as a timeout fallback.
    const timer = window.setTimeout(
      () => setNavigationPending(false),
      NAVIGATION_INDICATOR_TIMEOUT_MS,
    );

    return () => window.clearTimeout(timer);
  }, [navigationPending]);

  function isPrimaryNavigation(
    event: MouseEvent<HTMLAnchorElement> | PointerEvent<HTMLAnchorElement>,
  ) {
    return (
      event.button === 0 &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      event.currentTarget.target !== "_blank" &&
      !event.currentTarget.hasAttribute("download")
    );
  }

  function handlePointerDown(event: PointerEvent<HTMLAnchorElement>) {
    onPointerDown?.(event);
  }

  function handlePointerCancel(event: PointerEvent<HTMLAnchorElement>) {
    setNavigationPending(false);
    onPointerCancel?.(event);
  }

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);

    if (event.defaultPrevented || !isPrimaryNavigation(event)) {
      setNavigationPending(false);
      return;
    }

    const sourceUrl = window.location.href;
    const targetUrl = new URL(href, sourceUrl);

    if (
      targetUrl.href === sourceUrl ||
      targetUrl.origin !== window.location.origin
    ) {
      setNavigationPending(false);
      return;
    }

    // Leave the anchor's native default action intact. This creates exactly
    // one full-document request and avoids the fragile client RSC transition.
    setNavigationPending(true);
  }

  return (
    <>
      <a
        href={href}
        data-full-page-link="true"
        data-navigation-mode="document"
        data-navigation-pending={navigationPending ? "true" : undefined}
        data-prefetch-intent={prefetch ? "true" : undefined}
        onClick={handleClick}
        onPointerCancel={handlePointerCancel}
        onPointerDown={handlePointerDown}
        {...props}
      >
        {children}
      </a>

      {navigationPending && portalHost
        ? createPortal(<BrandedLoadingScreen />, portalHost)
        : null}
    </>
  );
}
