import { randomUUID } from "node:crypto";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { createTransactionalDatabase } from "@/db/transaction";
import { sharedMedia, user } from "@/db/schema";
import { getSession, isSystemAdmin } from "@/lib/session";
import { isTrustedMutationRequest, mutationRejectedResponse } from "@/lib/request-security";
import { MEDIA_CONSENT_TEXT, MEDIA_CONSENT_VERSION, MAX_MEDIA_BYTES, MAX_SHARED_BYTES, MAX_OWNER_FILES, isMediaType, mediaPath, safeMediaName } from "@/lib/shared-media";
import { mediaStorageConfigured, privateMediaHeaders } from "@/lib/shared-media-server";
export const runtime = "nodejs";
const inputSchema = z.object({ name: z.string().min(1).max(300), contentType: z.string().refine(isMediaType), byteSize: z.number().int().positive().max(MAX_MEDIA_BYTES), consent: z.literal(true), consentVersion: z.literal(MEDIA_CONSENT_VERSION) });
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401, headers: privateMediaHeaders });
  const admin = isSystemAdmin(session.user.role);
  if (!mediaStorageConfigured()) return Response.json({ configured: false, files: [], admin, currentUserId: session.user.id }, { headers: privateMediaHeaders });
  const query = new URL(request.url).searchParams;
  const offset = Number(query.get("offset") || "0");
  if (!Number.isInteger(offset) || offset < 0 || offset > 10000) return Response.json({ error: "Invalid page." }, { status: 400 });
  try {
    const files = await db.select({ id: sharedMedia.id, name: sharedMedia.name, contentType: sharedMedia.contentType, byteSize: sharedMedia.byteSize, ownerId: sharedMedia.ownerId, ownerName: user.name, status: sharedMedia.status, createdAt: sharedMedia.createdAt }).from(sharedMedia).innerJoin(user, eq(sharedMedia.ownerId, user.id))
      .where(and(ne(sharedMedia.status, "REVOKED"), admin && query.get("scope") === "all" ? undefined : eq(sharedMedia.ownerId, session.user.id)))
      .orderBy(desc(sharedMedia.createdAt), desc(sharedMedia.id)).limit(25).offset(offset);
    return Response.json({ configured: true, files: files.slice(0,24), nextOffset: files.length > 24 ? offset + 24 : null, admin, currentUserId: session.user.id }, { headers: privateMediaHeaders });
  } catch { return Response.json({ error: "Shared gallery is unavailable. Check the database migration and storage setup." }, { status: 503, headers: privateMediaHeaders }); }
}
export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) return mutationRejectedResponse();
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.session.impersonatedBy) return Response.json({ error: "Sign in with your own account to give sharing consent." }, { status: 403 });
  if (!mediaStorageConfigured()) return Response.json({ error: "Shared gallery storage has not been set up." }, { status: 503 });
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "Choose a supported file up to 25 MB and confirm the sharing notice." }, { status: 400 });
  const name = safeMediaName(input.data.name);
  if (!name) return Response.json({ error: "Please choose a file with a name." }, { status: 400 });
  const connection = createTransactionalDatabase();
  try {
    const created = await connection.database.transaction(async tx => {
      // Serialize quota reservations across concurrent requests and accounts.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(79102541)`);
      const [total] = await tx.select({ bytes: sql<number>`coalesce(sum(${sharedMedia.byteSize}),0)`, owned: sql<number>`count(*) filter (where ${sharedMedia.ownerId} = ${session.user.id})` }).from(sharedMedia).where(ne(sharedMedia.status, "REVOKED"));
      if (Number(total.bytes) + input.data.byteSize > MAX_SHARED_BYTES || Number(total.owned) >= MAX_OWNER_FILES) return null;
      const id = randomUUID();
      const pathname = mediaPath(id, input.data.contentType);
      await tx.insert(sharedMedia).values({ id, pathname, name, ownerId: session.user.id, contentType: input.data.contentType, byteSize: input.data.byteSize, consentVersion: MEDIA_CONSENT_VERSION, consentText: MEDIA_CONSENT_TEXT, consentedAt: new Date() });
      return { id, pathname };
    });
    return created ? Response.json(created, { status: 201, headers: privateMediaHeaders }) : Response.json({ error: "Shared gallery limit reached. Remove unused shared files before uploading more." }, { status: 409 });
  } catch { return Response.json({ error: "Could not prepare sharing. Check the database migration and storage setup." }, { status: 503 }); }
  finally { await connection.close(); }
}
