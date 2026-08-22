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

const STORAGE_KEY = "mnm:offline-mutation-queue:v1";
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
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) ?? "[]") as unknown;
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

  storage.setItem(STORAGE_KEY, JSON.stringify(items.slice(-MAX_ITEMS)));
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

function shouldBlockForStatus(status: number): boolean {
  return [400, 401, 403, 404, 409, 422].includes(status);
}

async function responseError(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => null)) as
    | { error?: string }
    | null;

  return payload?.error ?? `Server returned ${response.status}.`;
}

export async function flushOfflineQueue(options: {
  forceBlocked?: boolean;
} = {}): Promise<{
  synced: number;
  remaining: number;
  blocked: number;
}> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const items = readOfflineQueue();
    return {
      synced: 0,
      remaining: items.length,
      blocked: items.filter((item) => item.blocked).length,
    };
  }

  const items = readOfflineQueue();
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

  writeOfflineQueue(remaining);
  return {
    synced,
    remaining: remaining.length,
    blocked: remaining.filter((item) => item.blocked).length,
  };
}
