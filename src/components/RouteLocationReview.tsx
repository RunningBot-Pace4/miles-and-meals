"use client";
import { useEffect, useRef, useState } from "react";
import type { Coordinates } from "@/lib/place-distance";
import "maplibre-gl/dist/maplibre-gl.css";

export function RouteLocationReview({ start, end, stayName, placeName }: {
  start: Coordinates; end: Coordinates; stayName: string; placeName: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let disposed = false;
    let map: import("maplibre-gl").Map | undefined;
    let resize: ResizeObserver | undefined;
    setFailed(false);
    void import("maplibre-gl").then(m => {
      if (disposed || !container.current) return;
      m.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      map = new m.Map({ container: container.current, style: "https://tiles.openfreemap.org/styles/liberty", center: [start.longitude, start.latitude], zoom: 12 });
      map.addControl(new m.NavigationControl());
      new m.Marker({ color: "#087f73" }).setLngLat([start.longitude, start.latitude]).setPopup(new m.Popup().setText("Stay: " + stayName)).addTo(map);
      new m.Marker({ color: "#be5b24" }).setLngLat([end.longitude, end.latitude]).setPopup(new m.Popup().setText("Place: " + placeName)).addTo(map);
      const bounds = new m.LngLatBounds([start.longitude, start.latitude], [start.longitude, start.latitude]).extend([end.longitude, end.latitude]);
      map.fitBounds(bounds, { padding: 45, maxZoom: 16, duration: 0 });
      resize = new ResizeObserver(() => map?.resize());
      resize.observe(container.current);
      map.on("error", () => { if (!disposed) setFailed(true); });
    }).catch(() => { if (!disposed) setFailed(true); });
    return () => { disposed = true; resize?.disconnect(); map?.remove(); };
  }, [start.latitude, start.longitude, end.latitude, end.longitude, stayName, placeName]);
  const link = (point: Coordinates) => `https://www.google.com/maps/search/?api=1&query=${point.latitude},${point.longitude}`;
  return <section className="route-location-review" aria-label="Review route locations">
    <div className="route-location-legend"><a href={link(start)} target="_blank" rel="noreferrer"><i className="route-stay-dot" />Stay · {stayName} ↗</a><a href={link(end)} target="_blank" rel="noreferrer"><i className="route-place-dot" />Place · {placeName} ↗</a></div>
    <div ref={container} className="route-review-map" />
    {failed ? <p role="status">Map could not load. Use the location links above to check both pins.</p> : <p>Check that both pins are in the right location. These are the saved endpoints used for distance checks.</p>}
  </section>;
}
