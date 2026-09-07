"use client";

import { FullPageLink as Link } from "@/components/FullPageLink";
import {
  NAVIGATION_COMPLETE_EVENT,
  NAVIGATION_START_EVENT,
} from "@/lib/navigation-intent";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type IconName = "home" | "plan" | "plus" | "map" | "more";

type NavigationStartEvent = CustomEvent<{
  href: string;
  pathname: string;
}>;

const links: {
  href: string;
  label: string;
  icon: IconName;
  action?: boolean;
}[] = [
  { href: "/dashboard", label: "Home", icon: "home" },
  { href: "/planner", label: "Plan", icon: "plan" },
  { href: "/expenses/new", label: "Add", icon: "plus", action: true },
  { href: "/location", label: "Map", icon: "map" },
  { href: "/more", label: "More", icon: "more" },
];

const morePrefixes = [
  "/expenses",
  "/settlements",
  "/admin",
  "/settings",
  "/trips",
  "/notifications",
  "/activity",
  "/export",
  "/search",
  "/wrapped",
  "/journeys",
  "/offline",
  "/documents",
  "/companion",
  "/memories",
  "/receipts",
];

function matchesPath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isMoreSection(pathname: string): boolean {
  return morePrefixes.some((prefix) => matchesPath(pathname, prefix));
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

  if (name === "map") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m3.5 6.5 5-2 7 2 5-2v13l-5 2-7-2-5 2v-13Z" />
        <path d="M8.5 4.5v13M15.5 6.5v13" />
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
  const [pendingPathname, setPendingPathname] = useState<string | null>(null);

  useEffect(() => {
    setPortalHost(document.body);
  }, []);

  useEffect(() => {
    function handleNavigationStart(event: Event) {
      const navigationEvent = event as NavigationStartEvent;
      setPendingPathname(navigationEvent.detail?.pathname ?? null);
    }

    function handleNavigationComplete() {
      setPendingPathname(null);
    }

    window.addEventListener(NAVIGATION_START_EVENT, handleNavigationStart);
    window.addEventListener(
      NAVIGATION_COMPLETE_EVENT,
      handleNavigationComplete,
    );

    return () => {
      window.removeEventListener(NAVIGATION_START_EVENT, handleNavigationStart);
      window.removeEventListener(
        NAVIGATION_COMPLETE_EVENT,
        handleNavigationComplete,
      );
    };
  }, []);

  useEffect(() => {
    setPendingPathname(null);
  }, [pathname]);

  const visiblePathname = pendingPathname ?? pathname;
  const navigation = (
    <nav
      className="mobile-nav"
      aria-label="Main navigation"
      data-app-mobile-nav="true"
      data-navigation-pending={pendingPathname ? "true" : "false"}
    >
      {links.map((link) => {
        const moreSection =
          link.href === "/more" && isMoreSection(visiblePathname);
        const active =
          !link.action &&
          (matchesPath(visiblePathname, link.href) || moreSection);
        const pending =
          Boolean(pendingPathname) &&
          (matchesPath(pendingPathname ?? "", link.href) ||
            (link.href === "/more" && isMoreSection(pendingPathname ?? "")));

        return (
          <Link
            className={[
              "nav-item",
              active ? "active" : "",
              pending ? "pending" : "",
              link.action ? "nav-action" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            href={link.href}
            prefetch
            key={link.href}
            aria-current={active ? "page" : undefined}
            aria-busy={pending || undefined}
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
