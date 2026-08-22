export type OfflineMutation = {
  id: string;
  url: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  label: string;
  createdAt: string;
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
  input: Omit<OfflineMutation, "id" | "createdAt">,
): OfflineMutation {
  const item: OfflineMutation = {
    ...input,
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
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

export async function flushOfflineQueue(): Promise<{
  synced: number;
  remaining: number;
}> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const remaining = readOfflineQueue().length;
    return { synced: 0, remaining };
  }

  const items = readOfflineQueue();
  let synced = 0;
  const remaining: OfflineMutation[] = [];

  for (const item of items) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: item.body === undefined ? undefined : { "content-type": "application/json" },
        body: item.body === undefined ? undefined : JSON.stringify(item.body),
      });

      if (response.ok) {
        synced += 1;
        continue;
      }

      // Authentication or a server-side conflict should be kept for a later retry.
      // Other validation errors also stay visible rather than silently dropping data.
      remaining.push(item);
    } catch {
      remaining.push(item);
    }
  }

  writeOfflineQueue(remaining);
  return { synced, remaining: remaining.length };
}
