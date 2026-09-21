import type { Coordinates } from "./place-distance";

export async function routeDistance(start: Coordinates, end: Coordinates, mode: "walk" | "drive", apiKey: string, refresh = false) {
  const params = new URLSearchParams({ waypoints: `${start.latitude},${start.longitude}|${end.latitude},${end.longitude}`, mode, units: "metric", format: "json", apiKey });
  const response = await fetch(`https://api.geoapify.com/v1/routing?${params}`, { ...(refresh ? { cache: "no-store" as const } : { next: { revalidate: 86400 } }), signal: AbortSignal.timeout(12000) });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("The Geoapify key cannot access Routing API. Check the key restrictions in Geoapify.");
    }
    if (response.status === 429) throw new Error("Route allowance reached. Please try again later.");
    throw new Error("Routing is temporarily unavailable.");
  }
  const data = await response.json();
  const route = data.results?.[0];
  if (!route) return null;
  const distanceUnit = typeof route.distance_units === "string" ? route.distance_units.trim().toLowerCase() : "meters";
  if (typeof route.distance !== "number" || !Number.isFinite(route.distance) || route.distance < 0 || typeof route.time !== "number" || !Number.isFinite(route.time) || route.time < 0 || !["meter", "meters", "metre", "metres"].includes(distanceUnit)) throw new Error("Routing returned an invalid distance.");
  return { km: route.distance / 1000, minutes: Math.ceil(route.time / 60) };
}
