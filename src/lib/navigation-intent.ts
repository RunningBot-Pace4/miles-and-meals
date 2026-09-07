"use client";

export const NAVIGATION_START_EVENT = "miles-meals:navigation-start";
export const NAVIGATION_COMPLETE_EVENT = "miles-meals:navigation-complete";

const NAVIGATION_INTENT_KEY = "mnm:navigation-intent:v2";
const NAVIGATION_RECOVERY_KEY = "mnm:navigation-recovery:v2";
const INTENT_MAX_AGE_MS = 30_000;
const RECOVERY_MAX_AGE_MS = 60_000;

export type NavigationIntent = {
  from: string;
  href: string;
  startedAt: number;
  installedPwa: boolean;
};

type NavigationStartDetail = {
  href: string;
  pathname: string;
};

function safeSessionStorage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function normalizeUrl(value: string): string {
  const url = new URL(value, window.location.href);
  url.hash = "";
  return url.href;
}

function parseStoredIntent(value: string | null): NavigationIntent | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<NavigationIntent>;

    if (
      typeof parsed.from !== "string" ||
      typeof parsed.href !== "string" ||
      typeof parsed.startedAt !== "number" ||
      typeof parsed.installedPwa !== "boolean"
    ) {
      return null;
    }

    return parsed as NavigationIntent;
  } catch {
    return null;
  }
}

function isInstalledPwa(): boolean {
  const navigatorWithStandalone = navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean(navigatorWithStandalone.standalone)
  );
}

export function beginNavigationIntent(href: string): void {
  const target = new URL(href, window.location.href);
  const intent: NavigationIntent = {
    from: normalizeUrl(window.location.href),
    href: normalizeUrl(target.href),
    startedAt: Date.now(),
    installedPwa: isInstalledPwa(),
  };

  const storage = safeSessionStorage();
  storage?.removeItem(NAVIGATION_RECOVERY_KEY);
  storage?.setItem(
    NAVIGATION_INTENT_KEY,
    JSON.stringify(intent),
  );

  document.documentElement.dataset.appNavigating = "true";
  window.dispatchEvent(
    new CustomEvent<NavigationStartDetail>(NAVIGATION_START_EVENT, {
      detail: {
        href: target.href,
        pathname: target.pathname,
      },
    }),
  );
}

export function completeNavigationIntent(): void {
  const storage = safeSessionStorage();
  storage?.removeItem(NAVIGATION_INTENT_KEY);
  storage?.removeItem(NAVIGATION_RECOVERY_KEY);

  delete document.documentElement.dataset.appNavigating;
  window.dispatchEvent(new Event(NAVIGATION_COMPLETE_EVENT));
}

export function readNavigationIntent(): NavigationIntent | null {
  const storage = safeSessionStorage();
  const intent = parseStoredIntent(storage?.getItem(NAVIGATION_INTENT_KEY) ?? null);

  if (!intent) {
    return null;
  }

  if (Date.now() - intent.startedAt > INTENT_MAX_AGE_MS) {
    storage?.removeItem(NAVIGATION_INTENT_KEY);
    return null;
  }

  return intent;
}

export function recoverInterruptedNavigation(): boolean {
  const intent = readNavigationIntent();

  if (!intent) {
    return false;
  }

  const current = normalizeUrl(window.location.href);

  if (current !== intent.from || current === intent.href) {
    return false;
  }

  const storage = safeSessionStorage();
  const recoveryRaw = storage?.getItem(NAVIGATION_RECOVERY_KEY) ?? null;

  if (recoveryRaw) {
    try {
      const recovery = JSON.parse(recoveryRaw) as {
        href?: string;
        recoveredAt?: number;
      };

      if (
        recovery.href === intent.href &&
        typeof recovery.recoveredAt === "number" &&
        Date.now() - recovery.recoveredAt < RECOVERY_MAX_AGE_MS
      ) {
        return false;
      }
    } catch {
      storage?.removeItem(NAVIGATION_RECOVERY_KEY);
    }
  }

  storage?.setItem(
    NAVIGATION_RECOVERY_KEY,
    JSON.stringify({
      href: intent.href,
      recoveredAt: Date.now(),
    }),
  );

  window.location.assign(intent.href);
  return true;
}
