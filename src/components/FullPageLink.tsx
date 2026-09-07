"use client";

import NextLink from "next/link";
import type {
  ComponentProps,
  MouseEvent,
  ReactNode,
} from "react";

type FullPageLinkProps = Omit<
  ComponentProps<typeof NextLink>,
  "children" | "href" | "prefetch"
> & {
  href: string;
  children: ReactNode;
  prefetch?: boolean | null;
};

type StandaloneNavigator = Navigator & {
  standalone?: boolean;
};

function isInstalledPwa() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as StandaloneNavigator).standalone)
  );
}

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

    if (
      event.defaultPrevented ||
      !isPrimaryNavigation(event) ||
      !isInstalledPwa()
    ) {
      return;
    }

    const sourceUrl = window.location.href;
    const targetUrl = new URL(href, sourceUrl);

    if (
      targetUrl.href === sourceUrl ||
      targetUrl.origin !== window.location.origin
    ) {
      return;
    }

    // Installed PWAs use one immediate document request. Preventing the
    // Next.js click first guarantees that an RSC request and a document
    // request can never compete or create the global route-error screen.
    event.preventDefault();
    window.location.href = targetUrl.href;
  }

  return (
    <NextLink
      {...props}
      href={href}
      prefetch={prefetch}
      onClick={handleClick}
      data-full-page-link="true"
      data-navigation-mode="client"
      data-pwa-navigation-mode="document"
      data-prefetch-intent={prefetch === false ? "off" : "adaptive"}
    >
      {children}
    </NextLink>
  );
}
