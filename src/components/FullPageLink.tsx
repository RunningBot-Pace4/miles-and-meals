import type {
  AnchorHTMLAttributes,
  ReactNode,
} from "react";
import NextLink from "next/link";

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
  ...props
}: FullPageLinkProps) {
  const useNativeNavigation =
    Boolean(props.download) ||
    Boolean(props.target) ||
    !href.startsWith("/") ||
    href.startsWith("//") ||
    href.startsWith("/api/");

  if (useNativeNavigation) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }

  return (
    <NextLink href={href} {...props}>
      {children}
    </NextLink>
  );
}
