import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { travelItems } from "@/db/schema";
import { getSession } from "@/lib/session";
import { canAccessCountry, getCountryWithTrip } from "@/lib/access";
import { getTripCapabilities } from "@/lib/trip-capabilities";
import { closedTripReadOnlyResponse } from "@/lib/financial-close";
import { isTrustedMutationRequest, mutationRejectedResponse } from "@/lib/request-security";
import { uuidSchema } from "@/lib/validation";
import { itineraryKey, MAX_ITINERARY_BYTES } from "@/lib/itinerary-import";
import { readItineraryWorkbook, writeItineraryWorkbook } from "@/lib/itinerary-excel";
export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in to download your itinerary." }, { status: 401 });
  const query = new URL(request.url).searchParams;
  const countryId = query.get("countryId") ?? "";
  if (!uuidSchema.safeParse(countryId).success) return Response.json({ error: "Choose a trip first." }, { status: 400 });
  if (!(await canAccessCountry(session.user, countryId))) return Response.json({ error: "Trip access denied." }, { status: 403 });
  const country = await getCountryWithTrip(countryId);
  if (!country) return Response.json({ error: "Trip not found." }, { status: 404 });
  const template = query.get("template") === "1";
  const items = template ? [] : await db.select().from(travelItems).where(and(eq(travelItems.countryId, countryId), eq(travelItems.itemType, "ITINERARY"))).orderBy(asc(travelItems.itemDate), asc(travelItems.sortOrder), asc(travelItems.itemTime));
  const bytes = await writeItineraryWorkbook(items.map(item => ({ title: item.title, itemDate: item.itemDate ?? "", itemTime: item.itemTime ?? "", area: item.area ?? "", subtype: item.subtype ?? "", linkUrl: item.linkUrl ?? "", notes: item.notes ?? "" })), country.tripName, template);
  return new Response(new Uint8Array(bytes), { headers: {
    "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "content-disposition": `attachment; filename="miles-meals-${template ? "itinerary-template" : "itinerary"}.xlsx"`,
    "cache-control": "private, no-store",
    "x-content-type-options": "nosniff",
  } });
}

export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) return mutationRejectedResponse();
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in to preview an itinerary." }, { status: 401 });
  try {
    // Read a bounded multipart body even when Content-Length is absent.
    const reader = request.body?.getReader();
    if (!reader) return Response.json({ error: "Choose an Excel file." }, { status: 400 });
    const chunks: Uint8Array[] = []; let length = 0;
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      length += value.byteLength;
      if (length > MAX_ITINERARY_BYTES + 100_000) { await reader.cancel(); return Response.json({ error: "Choose an XLSX file up to 2 MB." }, { status: 413 }); }
      chunks.push(value);
    }
    const form = await new Response(Buffer.concat(chunks), { headers: { "content-type": request.headers.get("content-type") ?? "" } }).formData();
    const countryId = String(form.get("countryId") ?? "");
    if (!uuidSchema.safeParse(countryId).success) return Response.json({ error: "Choose a trip first." }, { status: 400 });
    if (!(await canAccessCountry(session.user, countryId))) return Response.json({ error: "Trip access denied." }, { status: 403 });
    const country = await getCountryWithTrip(countryId);
    if (!country) return Response.json({ error: "Trip not found." }, { status: 404 });
    if (!(await getTripCapabilities(session.user, country.tripId)).canEditPlan) return Response.json({ error: "Plan editing permission is required." }, { status: 403 });
    const locked = await closedTripReadOnlyResponse(country.tripId); if (locked) return locked;
    const file = form.get("file");
    if (!(file instanceof File) || !/\.xlsx$/i.test(file.name) || file.size > MAX_ITINERARY_BYTES) return Response.json({ error: "Choose an XLSX file up to 2 MB." }, { status: 400 });
    const result = await readItineraryWorkbook(new Uint8Array(await file.arrayBuffer()), String(form.get("sheet") ?? "") || undefined);
    const existing = await db.select().from(travelItems).where(and(eq(travelItems.countryId, countryId), eq(travelItems.itemType, "ITINERARY")));
    const keys = new Set(existing.map(item => itineraryKey({ ...item, itemDate: item.itemDate ?? "", itemTime: item.itemTime ?? "", area: item.area ?? "" })));
    return Response.json({ ...result, rows: result.rows.map(row => ({ ...row, duplicate: row.duplicate || keys.has(itineraryKey(row)) })) }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    // Parser errors are local validation errors; no provider keys or SQL are returned.
    const message = error instanceof Error ? error.message : "";
    const safe = /^(Choose|Workbook|Macro|Unsupported XML|Use|Repeated|Remove excess|Import up to)/.test(message);
    return Response.json({ error: safe ? message : "Could not read this workbook. Save it as .xlsx using the template and try again." }, { status: 400 });
  }
}
