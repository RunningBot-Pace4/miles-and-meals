import { clearOfflinePack } from "@/lib/offline-pack";
import { clearOfflineQueue } from "@/lib/offline-queue";

/**
 * Remove private travel data that is intentionally cached in this browser.
 * PWA installation preferences are kept, but drafts, saved offline packs and
 * queued financial mutations are removed so a later account on the same device
 * cannot inherit the previous traveler's local data.
 */
export function clearPrivateDeviceData(): void {
  if (typeof window === "undefined") return;

  clearOfflinePack();
  clearOfflineQueue();

  try {
    const draftKeys: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith("mnm:draft:")) draftKeys.push(key);
    }
    for (const key of draftKeys) window.localStorage.removeItem(key);
  } catch {
    // Browser storage may be unavailable in private/restricted contexts.
  }
}
