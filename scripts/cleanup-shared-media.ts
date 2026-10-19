import "dotenv/config";
import { del, list } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { db } from "../src/db/index";
import { sharedMedia } from "../src/db/schema";
// Dry-run by default. --apply deletes only revoked, expired or orphaned gallery objects.
const apply = process.argv.includes("--apply");
if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("Private Blob storage token is required.");
const rows = await db.select().from(sharedMedia);
const byPath = new Map(rows.map(row => [row.pathname, row]));
const now = Date.now();
for (const row of rows) {
  if (row.status === "REVOKED" || (row.status === "UPLOADING" && now - row.createdAt.getTime() > 20 * 60_000)) {
    console.log(apply ? "Revoke / delete" : "Would revoke / delete", row.id);
    if (apply) {
      // Revoke before touching storage, including when provider deletion fails.
      await db.update(sharedMedia).set({ status: "REVOKED", revokedAt: row.revokedAt || new Date() }).where(eq(sharedMedia.id, row.id));
      await del(row.pathname);
    }
  }
}
let cursor: string | undefined;
do {
  const page = await list({ prefix: "shared-media/", cursor, limit: 1000 });
  for (const blob of page.blobs) {
    // Deleted accounts/resets can orphan blobs. Allow 24 hours for in-flight uploads.
    if (!byPath.has(blob.pathname) && now - blob.uploadedAt.getTime() > 24 * 60 * 60_000) {
      console.log(apply ? "Delete orphan" : "Would delete orphan", blob.pathname);
      if (apply) await del(blob.pathname);
    }
  }
  cursor = page.hasMore ? page.cursor : undefined;
} while (cursor);
console.log(apply ? "Cleanup complete." : "Dry run complete. Review before rerunning with --apply.");
