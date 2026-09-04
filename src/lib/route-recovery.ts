const ROUTE_RECOVERY_KEY = "mnm:route-recovery:v92-25";
const ROUTE_RECOVERY_WINDOW_MS = 45_000;

type RecoveryRecord = {
  target: string;
  attemptedAt: number;
};

export type RouteRecoveryDecision = "offline" | "reload" | "manual";

export function shouldAttemptRouteRecovery(
  storedValue: string | null,
  target: string,
  now: number,
): boolean {
  if (!storedValue) return true;

  try {
    const record = JSON.parse(storedValue) as Partial<RecoveryRecord>;
    return !(
      record.target === target &&
      typeof record.attemptedAt === "number" &&
      now - record.attemptedAt < ROUTE_RECOVERY_WINDOW_MS
    );
  } catch {
    return true;
  }
}

export function beginRouteRecovery(): RouteRecoveryDecision {
  if (!navigator.onLine) return "offline";

  const target = `${window.location.pathname}${window.location.search}`;
  const now = Date.now();

  try {
    const storedValue = window.sessionStorage.getItem(ROUTE_RECOVERY_KEY);

    if (!shouldAttemptRouteRecovery(storedValue, target, now)) {
      return "manual";
    }

    window.sessionStorage.setItem(
      ROUTE_RECOVERY_KEY,
      JSON.stringify({ target, attemptedAt: now } satisfies RecoveryRecord),
    );
  } catch {
    // Never create a reload loop when browser storage is unavailable.
    return "manual";
  }

  return "reload";
}

export function clearRouteRecovery(): void {
  try {
    window.sessionStorage.removeItem(ROUTE_RECOVERY_KEY);
  } catch {
    // Browser storage is optional.
  }
}

