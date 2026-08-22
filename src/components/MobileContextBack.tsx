"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";

const PRIMARY_ROUTES = new Set([
  "/dashboard",
  "/planner",
  "/expenses/new",
  "/location",
  "/more",
]);

const ROUTE_STACK_KEY = "mm:app-route-stack";

function fallbackFor(pathname: string): string {
  if (/^\/expenses\/[^/]+\/edit$/.test(pathname)) return "/expenses";
  if (pathname.startsWith("/admin/")) return "/admin";
  if (pathname.startsWith("/settings/")) return "/more";
  if (
    pathname === "/expenses" ||
    pathname === "/settlements" ||
    pathname === "/trips" ||
    pathname === "/notifications" ||
    pathname === "/activity" ||
    pathname === "/search" ||
    pathname === "/wrapped" ||
    pathname === "/export" ||
    pathname === "/admin"
  ) {
    return "/more";
  }
  return "/dashboard";
}

function readRouteStack(): string[] {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(ROUTE_STACK_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string" && item.startsWith("/"))
      : [];
  } catch {
    return [];
  }
}

function writeRouteStack(stack: string[]) {
  try {
    sessionStorage.setItem(ROUTE_STACK_KEY, JSON.stringify(stack.slice(-20)));
  } catch {
    // Private browsing / storage restrictions should never block navigation.
  }
}

export function MobileContextBack() {
  const pathname = usePathname();
  const fallback = useMemo(() => fallbackFor(pathname), [pathname]);
  const hidden = PRIMARY_ROUTES.has(pathname);

  useEffect(() => {
    const stack = readRouteStack();
    const last = stack.at(-1);

    if (last === pathname) return;

    // Browser Back to the previous app page: collapse the old top entry
    // instead of creating a loop in the custom mobile Back stack.
    if (stack.length >= 2 && stack.at(-2) === pathname) {
      stack.pop();
    } else {
      stack.push(pathname);
    }

    writeRouteStack(stack);
  }, [pathname]);

  if (hidden) return null;

  function goBack() {
    const stack = readRouteStack();
    if (stack.at(-1) === pathname) stack.pop();
    const previous = stack.at(-1) ?? "";

    if (previous && previous !== pathname) {
      writeRouteStack(stack);
      window.location.assign(previous);
      return;
    }

    window.location.assign(fallback);
  }

  return (
    <div className="mobile-context-back-row" aria-label="Page navigation">
      <button
        className="mobile-context-back"
        type="button"
        onClick={goBack}
        aria-label="Go back"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m14.5 6-6 6 6 6" />
        </svg>
        <span>Back</span>
      </button>
    </div>
  );
}
