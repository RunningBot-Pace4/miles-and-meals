import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

describe("offline resync reliability", () => {
  beforeEach(() => {
    vi.resetModules();
    const storage = new MemoryStorage();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { localStorage: storage, dispatchEvent: vi.fn() },
    });
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { onLine: true },
    });
    Object.defineProperty(globalThis, "CustomEvent", {
      configurable: true,
      value: class {
        constructor(public type: string, public init?: unknown) {}
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(globalThis, "window");
    Reflect.deleteProperty(globalThis, "navigator");
    Reflect.deleteProperty(globalThis, "CustomEvent");
    Reflect.deleteProperty(globalThis, "fetch");
  });

  it("does not lose a new change queued while an earlier change is syncing", async () => {
    const queue = await import("@/lib/offline-queue");
    queue.enqueueOfflineMutation({
      url: "/api/expenses",
      method: "POST",
      label: "First expense",
      body: { value: 1 },
    });

    const started = deferred<void>();
    const response = deferred<Response>();
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: vi.fn(async () => {
        started.resolve();
        return response.promise;
      }),
    });

    const flushing = queue.flushOfflineQueue();
    await started.promise;
    queue.enqueueOfflineMutation({
      url: "/api/expenses",
      method: "POST",
      label: "Second expense",
      body: { value: 2 },
    });
    response.resolve(new Response("{}", { status: 200 }));
    await flushing;

    expect(queue.readOfflineQueue().map((item) => item.label)).toEqual([
      "Second expense",
    ]);
  });

  it("serializes overlapping automatic resync calls", async () => {
    const queue = await import("@/lib/offline-queue");
    queue.enqueueOfflineMutation({
      url: "/api/expenses",
      method: "POST",
      label: "Only once",
      body: { value: 1 },
    });

    const response = deferred<Response>();
    const fetchMock = vi.fn(async () => response.promise);
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: fetchMock,
    });

    const first = queue.flushOfflineQueue();
    const second = queue.flushOfflineQueue();
    response.resolve(new Response("{}", { status: 200 }));
    await Promise.all([first, second]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(queue.readOfflineQueue()).toHaveLength(0);
  });
});
