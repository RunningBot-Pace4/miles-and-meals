import { del, get, head } from "@vercel/blob";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { sharedMedia } from "@/db/schema";
import { MEDIA_CONSENT_VERSION, mediaSignatureMatches } from "@/lib/shared-media";

export function mediaStorageConfigured() { return Boolean(process.env.BLOB_READ_WRITE_TOKEN); }
export const privateMediaHeaders = { "cache-control": "private, no-store, max-age=0", "x-content-type-options": "nosniff", "vary": "Cookie" };
export async function findSharedMedia(id: string) {
  const rows = await db.select().from(sharedMedia).where(eq(sharedMedia.id, id)).limit(1);
  return rows[0];
}
// Keep a tombstone so a late upload callback can never re-enable sharing.
export async function revokeSharedMedia(id: string) {
  const rows = await db.update(sharedMedia).set({ status: "REVOKED", revokedAt: new Date() }).where(eq(sharedMedia.id, id)).returning({ pathname: sharedMedia.pathname });
  if (!rows[0]) return true;
  try { await del(rows[0].pathname); return true; } catch { return false; }
}
export async function completeSharedMedia(id: string) {
  const row = await findSharedMedia(id);
  if (!row) return false;
  if (row.status === "REVOKED") { await del(row.pathname); return false; }
  if (row.status === "READY") return true;
  if (row.consentVersion !== MEDIA_CONSENT_VERSION || Date.now() - row.createdAt.getTime() > 20 * 60_000) { await revokeSharedMedia(id); return false; }
  const meta = await head(row.pathname);
  // A public store is a configuration error; never publish it in the app.
  if (!new URL(meta.url).hostname.endsWith(".private.blob.vercel-storage.com") || meta.pathname !== row.pathname || meta.size !== row.byteSize || meta.contentType !== row.contentType) {
    await revokeSharedMedia(id); return false;
  }
  const content = await get(row.pathname, { access: "private", headers: { Range: "bytes=0-511" } });
  if (!content?.stream) return false;
  const reader = content.stream.getReader();
  const prefix = new Uint8Array(512);
  let offset = 0;
  try {
    while (offset < prefix.length) {
      const chunk = await reader.read(); if (chunk.done) break;
      const part = chunk.value.subarray(0, prefix.length - offset); prefix.set(part, offset); offset += part.length;
    }
  } finally { await reader.cancel(); }
  if (!mediaSignatureMatches(row.contentType, prefix.subarray(0, offset))) { await revokeSharedMedia(id); return false; }
  const updated = await db.update(sharedMedia).set({ status: "READY" }).where(and(eq(sharedMedia.id, id), eq(sharedMedia.status, "UPLOADING"))).returning({ id: sharedMedia.id });
  if (!updated.length) {
    const current = await findSharedMedia(id);
    if (current?.status === "REVOKED") { await del(row.pathname); return false; }
    return current?.status === "READY";
  }
  return true;
}
