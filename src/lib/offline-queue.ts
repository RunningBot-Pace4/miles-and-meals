export type OfflineMutation = {
  id: string;
  url: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  label: string;
  createdAt: string;
  attempts?: number;
  lastAttemptAt?: string;
  lastError?: string;
  blocked?: boolean;
};

export const OFFLINE_MUTATION_STORAGE_KEY = "mnm:offline-mutation-queue:v1";
const MAX_ITEMS = 60;

function browserStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readOfflineQueue(): OfflineMutation[] {
  const storage = browserStorage();

  if (!storage) {
    return [];
  }

  try {
    const parsed = JSON.parse(storage.getItem(OFFLINE_MUTATION_STORAGE_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? (parsed as OfflineMutation[]) : [];
  } catch {
    return [];
  }
}

function writeOfflineQueue(items: OfflineMutation[]) {
  const storage = browserStorage();

  if (!storage) {
    throw new Error("Offline storage is not available on this device.");
  }

  storage.setItem(OFFLINE_MUTATION_STORAGE_KEY, JSON.stringify(items.slice(-MAX_ITEMS)));
  window.dispatchEvent(new CustomEvent("mnm:offline-queue-changed"));
}

export function enqueueOfflineMutation(
  input: Omit<
    OfflineMutation,
    "id" | "createdAt" | "attempts" | "lastAttemptAt" | "lastError" | "blocked"
  >,
): OfflineMutation {
  const item: OfflineMutation = {
    ...input,
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
    attempts: 0,
    blocked: false,
  };
  const current = readOfflineQueue();
  writeOfflineQueue([...current, item]);

  window.dispatchEvent(
    new CustomEvent("mnm:network-message", {
      detail: {
        type: "warning",
        message: `${item.label} saved on this device and will sync when you are back online.`,
      },
    }),
  );

  return item;
}

export function removeOfflineMutation(id: string) {
  writeOfflineQueue(readOfflineQueue().filter((item) => item.id !== id));
}

export function clearOfflineQueue(): void {
  const storage = browserStorage();
  if (!storage) return;
  try {
    storage.removeItem(OFFLINE_MUTATION_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("mnm:offline-queue-changed"));
  } catch {
    // Browser storage is best-effort.
  }
}

function shouldBlockForStatus(status: number): boolean {
  return [400, 401, 403, 404, 409, 422].includes(status);
}

type OfflineFlushResult = {
  synced: number;
  remaining: number;
  blocked: number;
};

let flushInFlight: Promise<OfflineFlushResult> | null = null;

async function responseError(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => null)) as
    | { error?: string }
    | null;

  return payload?.error ?? `Server returned ${response.status}.`;
}

async function flushOfflineQueueNow(options: {
  forceBlocked?: boolean;
} = {}): Promise<OfflineFlushResult> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const items = readOfflineQueue();
    return {
      synced: 0,
      remaining: items.length,
      blocked: items.filter((item) => item.blocked).length,
    };
  }

  const items = readOfflineQueue();
  const snapshotIds = new Set(items.map((item) => item.id));
  let synced = 0;
  const remaining: OfflineMutation[] = [];

  for (const item of items) {
    if (item.blocked && !options.forceBlocked) {
      remaining.push(item);
      continue;
    }

    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: item.body === undefined ? undefined : { "content-type": "application/json" },
        body: item.body === undefined ? undefined : JSON.stringify(item.body),
        credentials: "same-origin",
      });

      if (response.ok) {
        synced += 1;
        continue;
      }

      remaining.push({
        ...item,
        attempts: (item.attempts ?? 0) + 1,
        lastAttemptAt: new Date().toISOString(),
        lastError: await responseError(response),
        blocked: shouldBlockForStatus(response.status),
      });
    } catch {
      remaining.push({
        ...item,
        attempts: (item.attempts ?? 0) + 1,
        lastAttemptAt: new Date().toISOString(),
        lastError: "Connection failed. Miles & Meals will retry automatically.",
        blocked: false,
      });
    }
  }

  // A new offline change can be queued while this network pass is running.
  // Preserve those additions, and do not resurrect an item the user discarded
  // during the pass.
  const current = readOfflineQueue();
  const currentIds = new Set(current.map((item) => item.id));
  const additions = current.filter((item) => !snapshotIds.has(item.id));
  const retainedFailures = remaining.filter((item) => currentIds.has(item.id));
  const finalItems = [...retainedFailures, ...additions];

  writeOfflineQueue(finalItems);
  return {
    synced,
    remaining: finalItems.length,
    blocked: finalItems.filter((item) => item.blocked).length,
  };
}

export async function flushOfflineQueue(options: {
  forceBlocked?: boolean;
} = {}): Promise<OfflineFlushResult> {
  if (flushInFlight) {
    const result = await flushInFlight;

    // A manual reviewed retry must still get a forced pass if the automatic
    // pass it joined intentionally skipped blocked items.
    if (options.forceBlocked && result.blocked > 0) {
      return flushOfflineQueue(options);
    }

    return result;
  }

  const pass = flushOfflineQueueNow(options);
  const guardedPass = pass.finally(() => {
    if (flushInFlight === guardedPass) flushInFlight = null;
  });
  flushInFlight = guardedPass;
  return guardedPass;
}
