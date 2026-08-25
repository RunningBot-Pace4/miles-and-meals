import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  enqueueOfflineMutation,
  flushOfflineQueue,
  readOfflineQueue,
} from "@/lib/offline-queue";

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => void values.delete(key),
    setItem: (key, value) => void values.set(key, value),
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal("window", {
    localStorage: memoryStorage(),
    dispatchEvent: vi.fn(),
  });
  vi.stubGlobal("navigator", { onLine: true });
  vi.stubGlobal(
    "CustomEvent",
    class {
      constructor(
        public type: string,
        public init?: { detail?: unknown },
      ) {}
    },
  );
});

function queueOne() {
  return enqueueOfflineMutation({
    url: "/api/expenses",
    method: "POST",
    label: "Offline dinner",
    body: { description: "Dinner" },
  });
}

describe("offline mutation resync", () => {
  it("removes a mutation only after the server accepts it", async () => {
    const item = queueOne();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await flushOfflineQueue({ forceBlocked: true });

    expect(result).toEqual({ synced: 1, remaining: 0, blocked: 0 });
    expect(readOfflineQueue()).toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/expenses",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-mnm-offline-mutation-id": item.id,
        }),
      }),
    );
  });

  it("keeps validation failures visible for review", async () => {
    queueOne();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Trip is closed." }), {
          status: 409,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const result = await flushOfflineQueue({ forceBlocked: true });
    const [remaining] = readOfflineQueue();

    expect(result).toEqual({ synced: 0, remaining: 1, blocked: 1 });
    expect(remaining.blocked).toBe(true);
    expect(remaining.lastError).toBe("Trip is closed.");
  });

  it("retains connection failures for a later automatic retry", async () => {
    queueOne();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));

    const result = await flushOfflineQueue({ forceBlocked: true });
    const [remaining] = readOfflineQueue();

    expect(result).toEqual({ synced: 0, remaining: 1, blocked: 0 });
    expect(remaining.attempts).toBe(1);
    expect(remaining.nextAttemptAt).toBeTruthy();
    expect(remaining.lastError).toMatch(/still safe on this device/i);
  });

  it("retries immediately when connectivity returns even during backoff", async () => {
    queueOne();
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await flushOfflineQueue({ forceRetry: true });
    expect(readOfflineQueue()[0]?.nextAttemptAt).toBeTruthy();

    const result = await flushOfflineQueue({ forceRetry: true });
    expect(result).toEqual({ synced: 1, remaining: 0, blocked: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
