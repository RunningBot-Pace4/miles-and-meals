"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  completeNavigationIntent,
  NAVIGATION_START_EVENT,
} from "@/lib/navigation-intent";

export function NavigationExperience() {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    function handlePageShow() {
      completeNavigationIntent();
    }

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      previousPathname.current = pathname;
      completeNavigationIntent();
    }
  }, [pathname]);

  useEffect(() => {
    function handleNavigationStart() {
      document.documentElement.dataset.appNavigating = "true";
    }

    window.addEventListener(NAVIGATION_START_EVENT, handleNavigationStart);

    return () => {
      window.removeEventListener(NAVIGATION_START_EVENT, handleNavigationStart);
    };
  }, []);

  return (
    <div
      className="app-navigation-progress"
      aria-hidden="true"
      data-app-navigation-progress="true"
    >
      <span />
    </div>
  );
}
