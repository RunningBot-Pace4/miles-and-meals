"use client";
import { useEffect, useRef, useState } from "react";
import { placeCoordinates } from "@/lib/place-distance";
import type { SmartRouteItem } from "@/lib/smart-route";
import "maplibre-gl/dist/maplibre-gl.css";

export function PlanRouteMap({ items }: { items: SmartRouteItem[] }) {
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const pins = JSON.stringify(items.map((item, index) => ({ title: item.title, number: index + 1, point: placeCoordinates(item.linkUrl ?? "", item.notes ?? "") })).filter(item => item.point));
  useEffect(() => {
    let disposed = false;
    let map: import("maplibre-gl").Map | undefined;
    let observer: ResizeObserver | undefined;
    const points = JSON.parse(pins) as { title: string; number: number; point: { latitude: number; longitude: number } }[];
    setFailed(false);
    if (!points.length) return;
    void import("maplibre-gl").then(m => {
      if (disposed || !container.current) return;
      m.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      map = new m.Map({ container: container.current, style: "https://tiles.openfreemap.org/styles/liberty", center: [points[0].point.longitude, points[0].point.latitude], zoom: 13 });
      map.addControl(new m.NavigationControl());
      const bounds = new m.LngLatBounds();
      points.forEach(({ title, number, point }) => {
        const element = document.createElement("div");
        element.className = "plan-map-number"; element.textContent = String(number); element.setAttribute("aria-label", title);
        new m.Marker({ element }).setLngLat([point.longitude, point.latitude]).setPopup(new m.Popup().setText(title)).addTo(map!);
        bounds.extend([point.longitude, point.latitude]);
      });
      map.fitBounds(bounds, { padding: 45, maxZoom: 15, duration: 0 });
      observer = new ResizeObserver(() => map?.resize()); observer.observe(container.current);
      map.on("error", () => { if (!disposed) setFailed(true); });
    }).catch(() => { if (!disposed) setFailed(true); });
    return () => { disposed = true; observer?.disconnect(); map?.remove(); };
  }, [pins]);
  if (pins === "[]") return <p className="plan-map-empty">Set your first map pin to preview the day’s locations.</p>;
  return <div className="plan-route-map"><div ref={container} style={{ height: 250, width: "100%" }} />
    <p>{failed ? "Map unavailable. Your saved pins and direction links still work." : "Saved locations · Open Google Maps for the actual walking, transit or driving route."}</p>
  </div>;
}
