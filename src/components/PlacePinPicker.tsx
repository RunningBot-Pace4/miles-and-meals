"use client";
import { useEffect, useRef, useState } from "react";
import { coordinates, placeCoordinates, type Coordinates } from "@/lib/place-distance";
import "maplibre-gl/dist/maplibre-gl.css";

export function PlacePinPicker({ initial, onChoose, onCancel }: { initial?: Coordinates | null; onChoose: (point: Coordinates) => void; onCancel: () => void }) {
  const container = useRef<HTMLDivElement>(null);
  const [point, setPoint] = useState<Coordinates | null>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    let map: import("maplibre-gl").Map | undefined;
    let marker: import("maplibre-gl").Marker | undefined;
    void import("maplibre-gl").then(m => {
      if (cancelled || !container.current) return;
      m.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      map = new m.Map({ container: container.current, style: "https://tiles.openfreemap.org/styles/liberty", center: initial ? [initial.longitude, initial.latitude] : [0, 20], zoom: initial ? 15 : 2 });
      map.addControl(new m.NavigationControl());
      map.on("click", event => {
        const pin = { latitude: event.lngLat.lat, longitude: event.lngLat.lng };
        setPoint(pin); setError("");
        marker?.remove(); marker = new m.Marker().setLngLat(event.lngLat).addTo(map!);
      });
      map.on("error", () => setError("Map unavailable? Paste a full pin link or latitude, longitude below."));
    }).catch(() => setError("Map could not load. Paste a pin link or coordinates below."));
    return () => { cancelled = true; marker?.remove(); map?.remove(); };
  }, []);
  return <section className="place-pin-picker" aria-label="Choose exact location">
    <strong>Tap the exact building on the map</strong>
    <p>Zoom in, then tap to place your pin. The starting map view is not a saved pin.</p>
    <div ref={container} style={{ height: 300, width: "100%", borderRadius: 12 }} />
    <label>Or paste a full pin link / latitude, longitude<input value={value} onChange={event => { setValue(event.target.value); setPoint(null); }} placeholder="22.123456, 114.123456" /></label>
    <button className="button secondary" type="button" onClick={() => { const pin = coordinates(value) || placeCoordinates(value); if (pin) { setPoint(pin); setError(""); } else setError("No exact pin found. Short links and map camera positions are not precise pins."); }}>Read pin</button>
    {point ? <p role="status">Selected pin: {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)} · <a target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${point.latitude}&mlon=${point.longitude}#map=18/${point.latitude}/${point.longitude}`}>Check location ↗</a></p> : null}
    {error ? <p role="alert">{error}</p> : null}
    <div className="place-pin-actions"><button className="button primary" type="button" disabled={!point} onClick={() => point && onChoose(point)}>Use this pin</button><button className="button secondary" type="button" onClick={onCancel}>Cancel pin</button></div>
  </section>;
}
