import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { savedRouteDistances, travelItems, trips } from "@/db/schema";
import { canAccessCountry, getCountryWithTrip } from "@/lib/access";
import { getSession } from "@/lib/session";
import { getTripCapabilities } from "@/lib/trip-capabilities";
import { isTrustedMutationRequest, mutationRejectedResponse } from "@/lib/request-security";
import { routeDistance } from "@/lib/route-distance";
import { resolveRoutePins, routePinKey } from "@/lib/saved-route";
export const runtime = "nodejs";
const querySchema = z.object({ countryId: z.string().uuid(), mode: z.enum(["walk", "drive"]) });
const inputSchema = querySchema.extend({ stayId: z.string().uuid(), placeId: z.string().uuid() });

// Reading shared results never calls the routing provider.
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in to view routes." }, { status: 401 });
  const input = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!input.success) return Response.json({ error: "Choose a valid trip and mode." }, { status: 400 });
  if (!(await canAccessCountry(session.user, input.data.countryId))) return Response.json({ error: "Trip access denied." }, { status: 403 });
  try {
    const routes = await db.select().from(savedRouteDistances).where(and(eq(savedRouteDistances.countryId, input.data.countryId), eq(savedRouteDistances.mode, input.data.mode)));
    const items = await db.select().from(travelItems).where(eq(travelItems.countryId, input.data.countryId));
    return Response.json({ routes: routes.filter(route => {
      const pins = resolveRoutePins(items, route.countryId, route.stayId, route.placeId);
      return pins && route.pinKey === routePinKey(pins.start, pins.end, input.data.mode);
    }) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "Saved routes are unavailable. Ask the admin to check the shared-route database migration." }, { status: 503 });
  }
}
export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) return mutationRejectedResponse();
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in to calculate routes." }, { status: 401 });
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "Choose a saved stay, place and travel mode." }, { status: 400 });
  const { countryId, stayId, placeId, mode } = input.data;
  if (!(await canAccessCountry(session.user, countryId))) return Response.json({ error: "Trip access denied." }, { status: 403 });
  const country = await getCountryWithTrip(countryId);
  if (!country || !(await getTripCapabilities(session.user, country.tripId)).canEditPlan) return Response.json({ error: "Plan editing permission is required to recalculate routes." }, { status: 403 });
  const [trip] = await db.select({ status: trips.financialStatus }).from(trips).where(eq(trips.id, country.tripId)).limit(1);
  if (!trip || trip.status === "CLOSED") return Response.json({ error: "This trip is closed. Saved routes remain available." }, { status: 409 });
  const items = await db.select().from(travelItems).where(and(eq(travelItems.countryId, countryId), inArray(travelItems.id, [stayId, placeId])));
  const pins = resolveRoutePins(items, countryId, stayId, placeId);
  if (!pins) return Response.json({ error: "Set exact pins for both the stay and place." }, { status: 422 });
  const apiKey = process.env.GEOAPIFY_API_KEY?.trim();
  if (!apiKey) return Response.json({ error: "Route lookup needs GEOAPIFY_API_KEY in Vercel." }, { status: 503 });
  try {
    const route = await routeDistance(pins.start, pins.end, mode, apiKey, true);
    if (!route) {
      await db.delete(savedRouteDistances).where(and(eq(savedRouteDistances.countryId, countryId), eq(savedRouteDistances.stayId, stayId), eq(savedRouteDistances.placeId, placeId), eq(savedRouteDistances.mode, mode)));
      return Response.json({ route: null });
    }
    const checkedAt = new Date();
    const pinKey = routePinKey(pins.start, pins.end, mode);
    await db.insert(savedRouteDistances).values({ countryId, stayId, placeId, mode, pinKey, ...route, checkedAt }).onConflictDoUpdate({
      target: [savedRouteDistances.countryId, savedRouteDistances.stayId, savedRouteDistances.placeId, savedRouteDistances.mode],
      set: { pinKey, ...route, checkedAt },
    });
    return Response.json({ route, checkedAt, pinKey });
  } catch {
    return Response.json({ error: "Could not calculate and save this route. Check routing availability and the shared-route migration." }, { status: 502 });
  }
}
