"use client";

import { FullPageLink as Link } from "@/components/FullPageLink";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { QuickAddMenu } from "@/components/QuickAddMenu";

type IconName = "home" | "plan" | "plus" | "spend" | "more";

const links: {
  href: string;
  label: string;
  icon: IconName;
  action?: boolean;
}[] = [
  { href: "/dashboard", label: "Home", icon: "home" },
  { href: "/planner", label: "Plan", icon: "plan" },
  { href: "/add", label: "Add", icon: "plus", action: true },
  { href: "/spend", label: "Spend", icon: "spend" },
  { href: "/more", label: "More", icon: "more" },
];

const spendPrefixes = [
  "/spend",
  "/expenses",
  "/settlements",
  "/receipts",
  "/settings/budgets",
];

const morePrefixes = [
  "/more",
  "/location",
  "/trips",
  "/updates",
  "/notifications",
  "/activity",
  "/trip-story",
  "/memories",
  "/wrapped",
  "/offline",
  "/documents",
  "/companion",
  "/journeys",
  "/export",
  "/search",
  "/settings/profile",
  "/settings/notifications",
  "/settings/password",
  "/settings/permissions",
  "/admin",
];

function routeMatches(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function NavIcon({ name }: { name: IconName }) {
  if (name === "plus") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
    );
  }

  if (name === "home") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m3.5 10.5 8.5-7 8.5 7" />
        <path d="M5.5 9.5V21h13V9.5M9.5 21v-6h5v6" />
      </svg>
    );
  }

  if (name === "plan") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="5.5" width="16" height="15" rx="2" />
        <path d="M8 3v5M16 3v5M7.5 11h9M7.5 15h5" />
      </svg>
    );
  }

  if (name === "spend") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7.5h14.5A1.5 1.5 0 0 1 20 9v9.5A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-11Z" />
        <path d="M4 8V6a2 2 0 0 1 2-2h10" />
        <path d="M15 13h5M16.5 13h.01" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="5" cy="12" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="19" cy="12" r="1.4" />
    </svg>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPortalHost(document.body);
    const reset = () => setPendingHref(null);
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  useEffect(() => {
    if (!pendingHref) return;
    const timer = window.setTimeout(() => setPendingHref(null), 12_000);
    return () => window.clearTimeout(timer);
  }, [pendingHref]);

  const navigation = (
    <nav
      className="mobile-nav"
      aria-label="Main navigation"
      data-app-mobile-nav="true"
      data-navigation-pending={pendingHref ? "true" : undefined}
    >
      {links.map((link) => {
        if (link.action) return <QuickAddMenu key={link.href} />;
        const sectionActive =
          link.href === "/spend"
            ? routeMatches(pathname, spendPrefixes)
            : link.href === "/more"
              ? routeMatches(pathname, morePrefixes)
              : pathname === link.href ||
                pathname.startsWith(`${link.href}/`);

        const active = !link.action && sectionActive;
        const visuallyActive = pendingHref
          ? pendingHref === link.href
          : active;

        return (
          <Link
            className={[
              "nav-item",
              visuallyActive ? "active" : "",
              pendingHref === link.href ? "navigation-pending" : "",
              link.action ? "nav-action" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            href={link.href}
            prefetch
            key={link.href}
            aria-current={active ? "page" : undefined}
            onPointerCancel={() => setPendingHref(null)}
            onPointerDown={(event) => {
              if (event.button === 0 && pathname !== link.href) setPendingHref(link.href);
            }}
          >
            <span className="nav-icon">
              <NavIcon name={link.icon} />
            </span>
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return portalHost ? createPortal(navigation, portalHost) : navigation;
}
