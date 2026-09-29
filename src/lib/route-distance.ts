import { RouteLookupError } from "./route-error";
import type { Coordinates } from "./place-distance";

export async function routeDistance(start: Coordinates, end: Coordinates, mode: "walk" | "drive", apiKey: string, refresh = false) {
  const params = new URLSearchParams({ waypoints: `${start.latitude},${start.longitude}|${end.latitude},${end.longitude}`, mode, units: "metric", format: "json", apiKey });
  const response = await fetch(`https://api.geoapify.com/v1/routing?${params}`, { ...(refresh ? { cache: "no-store" as const } : { next: { revalidate: 86400 } }), signal: AbortSignal.timeout(12000) });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new RouteLookupError("Routing access is unavailable. Ask the trip admin to check the routing key.", 503);
    }
    if (response.status === 429) throw new RouteLookupError("Route allowance reached. Please try again later.", 429);
    throw new RouteLookupError("Routing is temporarily unavailable. Please try again later.");
  }
  const data = await response.json();
  const route = data.results?.[0];
  if (!route) return null;
  const distanceUnit = typeof route.distance_units === "string" ? route.distance_units.trim().toLowerCase() : "meters";
  if (typeof route.distance !== "number" || !Number.isFinite(route.distance) || route.distance < 0 || typeof route.time !== "number" || !Number.isFinite(route.time) || route.time < 0 || !["meter", "meters", "metre", "metres"].includes(distanceUnit)) throw new Error("Routing returned an invalid distance.");
  return { km: route.distance / 1000, minutes: Math.ceil(route.time / 60) };
}
