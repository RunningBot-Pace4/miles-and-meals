"use client";

import NextLink from "next/link";
import type {
  ComponentProps,
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

export function FullPageLink({
  href,
  children,
  prefetch = null,
  ...props
}: FullPageLinkProps) {
  return (
    <NextLink
      {...props}
      href={href}
      prefetch={prefetch}
      data-full-page-link="true"
      data-navigation-mode="client"
      data-prefetch-intent={prefetch === false ? "off" : "adaptive"}
    >
      {children}
    </NextLink>
  );
}
