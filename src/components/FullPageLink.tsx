"use client";

import NextLink from "next/link";
import type {
  ComponentProps,
  MouseEvent,
  ReactNode,
} from "react";
import { beginNavigationIntent } from "@/lib/navigation-intent";

type FullPageLinkProps = Omit<
  ComponentProps<typeof NextLink>,
  "children" | "href" | "prefetch"
> & {
  href: string;
  children: ReactNode;
  prefetch?: boolean | null;
};

function isPrimaryNavigation(event: MouseEvent<HTMLAnchorElement>) {
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

export function FullPageLink({
  href,
  children,
  prefetch = null,
  onClick,
  ...props
}: FullPageLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);

    if (event.defaultPrevented || !isPrimaryNavigation(event)) {
      return;
    }

    const sourceUrl = window.location.href;
    const targetUrl = new URL(href, sourceUrl);

    if (
      targetUrl.origin !== window.location.origin ||
      targetUrl.href === sourceUrl
    ) {
      return;
    }

    beginNavigationIntent(targetUrl.href);
  }

  return (
    <NextLink
      {...props}
      href={href}
      prefetch={prefetch}
      onClick={handleClick}
      data-full-page-link="true"
      data-navigation-mode="client"
      data-navigation-recovery="document-on-interrupted-transition"
      data-prefetch-intent={prefetch === false ? "off" : "adaptive"}
    >
      {children}
    </NextLink>
  );
}
