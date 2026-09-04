"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import type {
  AnchorHTMLAttributes,
  MouseEvent,
  PointerEvent,
  ReactNode,
} from "react";
import { useEffect, useRef, useState } from "react";

const NATIVE_NAVIGATION_FALLBACK_MS = 4_500;

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
  const pathname = usePathname();
  const fallbackTimerRef = useRef<number | null>(null);

  function clearNavigationFallback() {
    if (fallbackTimerRef.current !== null) {
      window.clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }

  useEffect(() => {
    setNavigationPending(false);
    clearNavigationFallback();

    return clearNavigationFallback;
  }, [pathname]);

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
    if (isPrimaryNavigation(event)) {
      setNavigationPending(true);
    }

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

    if (targetUrl.href === sourceUrl || targetUrl.origin !== window.location.origin) {
      setNavigationPending(false);
      return;
    }

    setNavigationPending(true);
    clearNavigationFallback();
    fallbackTimerRef.current = window.setTimeout(() => {
      if (window.location.href === sourceUrl) {
        window.location.assign(targetUrl.href);
      } else {
        setNavigationPending(false);
      }
    }, NATIVE_NAVIGATION_FALLBACK_MS);
  }

  return (
    <NextLink
      href={href}
      prefetch={prefetch}
      data-full-page-link="true"
      data-navigation-pending={navigationPending ? "true" : undefined}
      onClick={handleClick}
      onPointerCancel={handlePointerCancel}
      onPointerDown={handlePointerDown}
      {...props}
    >
      {children}
    </NextLink>
  );
}
