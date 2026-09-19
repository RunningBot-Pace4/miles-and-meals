import type { Coordinates } from "./place-distance";

export async function routeDistance(start: Coordinates, end: Coordinates, mode: "walk" | "drive", apiKey: string) {
  const params = new URLSearchParams({ waypoints: `${start.latitude},${start.longitude}|${end.latitude},${end.longitude}`, mode, units: "metric", format: "json", apiKey });
  const response = await fetch(`https://api.geoapify.com/v1/routing?${params}`, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(response.status === 429 ? "Route allowance reached. Please try again later." : "Routing is temporarily unavailable.");
  const data = await response.json();
  const route = data.results?.[0];
  if (!route) return null;
  if (typeof route.distance !== "number" || !Number.isFinite(route.distance) || route.distance < 0 || typeof route.time !== "number" || !Number.isFinite(route.time) || route.time < 0 || route.distance_units !== "Meters") throw new Error("Routing returned an invalid distance.");
  return { km: route.distance / 1000, minutes: Math.ceil(route.time / 60) };
}
