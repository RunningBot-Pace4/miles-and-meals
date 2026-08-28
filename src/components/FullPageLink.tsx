"use client";

import type {
  AnchorHTMLAttributes,
  MouseEvent,
  PointerEvent,
  ReactNode,
} from "react";
import { useState } from "react";

type FullPageLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
> & {
  href: string;
  children: ReactNode;
};

export function FullPageLink({
  href,
  children,
  onClick,
  onPointerCancel,
  onPointerDown,
  ...props
}: FullPageLinkProps) {
  const [navigationPending, setNavigationPending] = useState(false);

  function handlePointerDown(event: PointerEvent<HTMLAnchorElement>) {
    if (event.button === 0) {
      setNavigationPending(true);
    }

    onPointerDown?.(event);
  }

  function handlePointerCancel(event: PointerEvent<HTMLAnchorElement>) {
    setNavigationPending(false);
    onPointerCancel?.(event);
  }

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    setNavigationPending(true);
    onClick?.(event);

    if (event.defaultPrevented) {
      setNavigationPending(false);
    }
  }

  return (
    <a
      href={href}
      data-full-page-link="true"
      data-navigation-pending={navigationPending ? "true" : undefined}
      onClick={handleClick}
      onPointerCancel={handlePointerCancel}
      onPointerDown={handlePointerDown}
      {...props}
    >
      {children}
    </a>
  );
}
