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
  nextAttemptAt?: string;
};

export type OfflineFlushResult = {
  synced: number;
  remaining: number;
  blocked: number;
};

export const OFFLINE_MUTATION_STORAGE_KEY = "mnm:offline-mutation-queue:v1";
const MAX_ITEMS = 60;
const MAX_RETRY_DELAY_MS = 5 * 60 * 1000;
let automaticFlush: Promise<OfflineFlushResult> | null = null;
let flushTail: Promise<unknown> = Promise.resolve();

function browserStorage(): Storage | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readOfflineQueue(): OfflineMutation[] {
  const storage = browserStorage();
  if (!storage) return [];

  try {
    const parsed = JSON.parse(
      storage.getItem(OFFLINE_MUTATION_STORAGE_KEY) ?? "[]",
    ) as unknown;
    if (!Array.isArray(parsed)) return [];

    return (parsed as OfflineMutation[]).map((item) => {
      // v81 could block a valid cross-Trip mutation with the raw message
      // "Forbidden" when another Trip was active. Give only that exact legacy
      // failure one clean retry under v82's durable membership check.
      if (item.blocked && item.lastError?.trim().toLowerCase() === "forbidden") {
        return {
          ...item,
          blocked: false,
          nextAttemptAt: undefined,
          lastError: "Ready to retry with corrected Trip access.",
        };
      }

      return item;
    });
  } catch {
    return [];
  }
}

function writeOfflineQueue(items: OfflineMutation[]) {
  const storage = browserStorage();

  if (!storage) {
    throw new Error("Offline storage is not available on this device.");
  }

  storage.setItem(
    OFFLINE_MUTATION_STORAGE_KEY,
    JSON.stringify(items),
  );
  window.dispatchEvent(new CustomEvent("mnm:offline-queue-changed"));
}

function updateOfflineMutation(
  id: string,
  updater: (item: OfflineMutation) => OfflineMutation | null,
): boolean {
  const current = readOfflineQueue();
  const index = current.findIndex((item) => item.id === id);
  if (index < 0) return false;

  const nextItem = updater(current[index]);
  const next = [...current];
  if (nextItem) next[index] = nextItem;
  else next.splice(index, 1);
  writeOfflineQueue(next);
  return true;
}

function createMutationId(): string {
  const cryptoApi =
    typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  const uuidApi = cryptoApi as (Crypto & { randomUUID?: () => string }) | undefined;

  if (typeof uuidApi?.randomUUID === "function") {
    return uuidApi.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (cryptoApi) {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function enqueueOfflineMutation(
  input: Omit<
    OfflineMutation,
    | "id"
    | "createdAt"
    | "attempts"
    | "lastAttemptAt"
    | "lastError"
    | "blocked"
    | "nextAttemptAt"
  >,
): OfflineMutation {
  const current = readOfflineQueue();
  if (current.length >= MAX_ITEMS) {
    throw new Error(
      `This device already has ${MAX_ITEMS} unsynced changes. Connect and sync them before adding more so no offline data is lost.`,
    );
  }

  const item: OfflineMutation = {
    ...input,
    id: createMutationId(),
    createdAt: new Date().toISOString(),
    attempts: 0,
    blocked: false,
  };

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
  updateOfflineMutation(id, () => null);
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
  // Most client errors require a user decision, not an endless retry loop.
  // Only timeout/rate-limit style responses are safe to retry automatically.
  return status >= 400 && status < 500 && ![408, 425, 429].includes(status);
}

async function responseError(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => null)) as
    | { error?: string }
    | null;

  if (payload?.error && payload.error !== "Forbidden") return payload.error;
  if (response.status === 401) {
    return "Your sign-in expired. Sign in again, then sync this change.";
  }
  if (response.status === 403) {
    return "You no longer have access to the Trip saved with this change. Discard it, or ask the Trip Owner to restore your access.";
  }
  if (response.status === 423) {
    return "This Trip is closed and read-only. Reopen it before adding changes, or discard this saved change.";
  }
  return `The server could not accept this change (${response.status}).`;
}

function retryDelayMs(attempts: number): number {
  return Math.min(10_000 * 2 ** Math.max(0, attempts - 1), MAX_RETRY_DELAY_MS);
}

function retryDue(item: OfflineMutation, force: boolean): boolean {
  if (force) return true;
  if (!item.nextAttemptAt) return true;
  return Date.parse(item.nextAttemptAt) <= Date.now();
}

function markFailure(
  id: string,
  input: { message: string; blocked: boolean },
) {
  updateOfflineMutation(id, (current) => {
    const attempts = input.blocked && current.blocked
      ? current.attempts ?? 1
      : (current.attempts ?? 0) + 1;
    const now = new Date();
    const nextAttemptAt = input.blocked
      ? undefined
      : new Date(now.getTime() + retryDelayMs(attempts)).toISOString();

    return {
      ...current,
      attempts,
      lastAttemptAt: now.toISOString(),
      lastError: input.message,
      blocked: input.blocked,
      nextAttemptAt,
    };
  });
}

function clearRetryState(item: OfflineMutation): OfflineMutation {
  return {
    ...item,
    blocked: false,
    nextAttemptAt: undefined,
  };
}

async function performFlush(options: {
  forceRetry?: boolean;
  onlyId?: string;
}): Promise<OfflineFlushResult> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const items = readOfflineQueue();
    return {
      synced: 0,
      remaining: items.length,
      blocked: items.filter((item) => item.blocked).length,
    };
  }

  // Snapshot only the IDs. Every mutation is re-read immediately before and
  // after the request so a new offline change added during sync cannot be lost.
  const ids = readOfflineQueue()
    .filter((item) => !options.onlyId || item.id === options.onlyId)
    .map((item) => item.id);

  let synced = 0;

  for (const id of ids) {
    const item = readOfflineQueue().find((candidate) => candidate.id === id);
    if (!item) continue;

    const forceDue = Boolean(options.forceRetry);
    if (item.blocked) continue;
    if (!retryDue(item, forceDue)) continue;

    if (
      forceDue && item.nextAttemptAt
    ) {
      updateOfflineMutation(id, clearRetryState);
    }

    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers:
          item.body === undefined
            ? { "x-mnm-offline-mutation-id": item.id }
            : {
                "content-type": "application/json",
                "x-mnm-offline-mutation-id": item.id,
              },
        body: item.body === undefined ? undefined : JSON.stringify(item.body),
        credentials: "same-origin",
      });

      if (response.ok) {
        if (updateOfflineMutation(id, () => null)) synced += 1;
        continue;
      }

      const blocked = shouldBlockForStatus(response.status);
      markFailure(id, {
        message: await responseError(response),
        blocked,
      });
    } catch {
      markFailure(id, {
        message:
          "Connection failed. This change is still safe on this device and will retry automatically.",
        blocked: false,
      });
    }
  }

  const remaining = readOfflineQueue();
  return {
    synced,
    remaining: remaining.length,
    blocked: remaining.filter((item) => item.blocked).length,
  };
}

export async function flushOfflineQueue(
  options: { forceRetry?: boolean; onlyId?: string } = {},
): Promise<OfflineFlushResult> {
  const manual = Boolean(options.forceRetry || options.onlyId);

  if (!manual && automaticFlush) {
    return automaticFlush;
  }

  // Serialize every flush (automatic or manual) across all mounted sync controls.
  // This prevents the Offline Pack, focus/online handlers and sync badge from
  // sending the same queued mutation at the same time.
  const previous = flushTail.catch(() => undefined);
  const run = previous.then(() => performFlush(options));
  flushTail = run.then(() => undefined, () => undefined);

  if (!manual) {
    automaticFlush = run;
  }

  try {
    return await run;
  } finally {
    if (!manual && automaticFlush === run) automaticFlush = null;
  }
}

export async function retryOfflineMutation(id: string): Promise<OfflineFlushResult> {
  const item = readOfflineQueue().find((candidate) => candidate.id === id);
  if (item?.blocked) {
    const remaining = readOfflineQueue();
    return {
      synced: 0,
      remaining: remaining.length,
      blocked: remaining.filter((candidate) => candidate.blocked).length,
    };
  }
  return flushOfflineQueue({ forceRetry: true, onlyId: id });
}
