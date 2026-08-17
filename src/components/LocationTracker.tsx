"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";

type CountryOption = {
  id: string;
  name: string;
};

type LocationRow = {
  userId: string;
  name: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  createdAt: string;
};

export function LocationTracker({
  countries,
}: {
  countries: CountryOption[];
}) {
  const [countryId, setCountryId] = useState(countries[0]?.id ?? "");
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState("");
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const watchId = useRef<number | null>(null);
  const lastSent = useRef(0);
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markers = useRef<Map<string, MapLibreMarker>>(new Map());

  useEffect(() => {
    if (!countryId) {
      return;
    }

    let active = true;

    async function refresh() {
      const response = await fetch(`/api/locations?countryId=${countryId}`, {
        cache: "no-store",
      });

      if (!response.ok || !active) {
        return;
      }

      const payload = (await response.json()) as { locations: LocationRow[] };
      setLocations(payload.locations);
    }

    refresh().catch(() => undefined);
    const timer = window.setInterval(() => {
      refresh().catch(() => undefined);
    }, 10000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [countryId]);

  useEffect(() => {
    if (!mapContainer.current) {
      return;
    }

    let cancelled = false;

    async function setupMap() {
      const maplibre = await import("maplibre-gl");
      maplibre.setWorkerUrl("/maplibre-gl-worker.mjs");

      if (cancelled || !mapContainer.current || mapRef.current) {
        return;
      }

      mapRef.current = new maplibre.Map({
        container: mapContainer.current,
        style: "https://tiles.openfreemap.org/styles/bright",
        center: [101.6869, 3.139],
        zoom: 4,
      });

      mapRef.current.addControl(new maplibre.NavigationControl(), "top-right");
      mapRef.current.once("load", () => setMapReady(true));
    }

    setupMap().catch(() => setMessage("Map could not be loaded."));

    return () => {
      cancelled = true;
      setMapReady(false);
      mapRef.current?.remove();
      mapRef.current = null;
      markers.current.clear();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function syncMarkers() {
      const map = mapRef.current;

      if (!map) {
        return;
      }

      const maplibre = await import("maplibre-gl");

      if (cancelled) {
        return;
      }

      const activeIds = new Set(locations.map((location) => location.userId));

      for (const [userId, marker] of markers.current.entries()) {
        if (!activeIds.has(userId)) {
          marker.remove();
          markers.current.delete(userId);
        }
      }

      for (const location of locations) {
        let marker = markers.current.get(location.userId);

        if (!marker) {
          const element = document.createElement("div");
          element.className = "map-marker";
          element.textContent = location.name.slice(0, 2).toUpperCase();

          marker = new maplibre.Marker({ element })
            .setLngLat([location.longitude, location.latitude])
            .setPopup(
              new maplibre.Popup({ offset: 18 }).setText(
                `${location.name} · ${new Date(location.createdAt).toLocaleTimeString()}`,
              ),
            )
            .addTo(map);

          markers.current.set(location.userId, marker);
        } else {
          marker.setLngLat([location.longitude, location.latitude]);
        }
      }

      if (locations.length > 0) {
        const bounds = new maplibre.LngLatBounds();
        locations.forEach((location) =>
          bounds.extend([location.longitude, location.latitude]),
        );

        map.fitBounds(bounds, {
          padding: 60,
          maxZoom: 15,
          duration: 500,
        });
      }
    }

    syncMarkers().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [locations, mapReady]);

  function stopSharing() {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }

    setSharing(false);
    setMessage("Location sharing stopped.");
  }

  function startSharing() {
    if (!navigator.geolocation) {
      setMessage("This browser does not support GPS location.");
      return;
    }

    if (!countryId) {
      setMessage("Choose a country first.");
      return;
    }

    setMessage("Requesting location permission…");

    watchId.current = navigator.geolocation.watchPosition(
      async (position) => {
        setSharing(true);
        setMessage("Location sharing is active.");

        const now = Date.now();

        if (now - lastSent.current < 15000) {
          return;
        }

        lastSent.current = now;

        await fetch("/api/location", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            countryId,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyMeters: position.coords.accuracy,
          }),
        });
      },
      (error) => {
        setSharing(false);
        setMessage(error.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 20000,
      },
    );
  }

  useEffect(() => {
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, []);

  return (
    <div className="stack gap-lg">
      <section className="panel location-controls">
        <label>
          Country
          <select
            value={countryId}
            onChange={(event) => {
              stopSharing();
              setCountryId(event.target.value);
            }}
          >
            {countries.map((country) => (
              <option value={country.id} key={country.id}>
                {country.name}
              </option>
            ))}
          </select>
        </label>
        <button
          className={sharing ? "button danger-button" : "button primary"}
          type="button"
          onClick={sharing ? stopSharing : startSharing}
        >
          {sharing ? "Stop sharing" : "Start sharing location"}
        </button>
        <p className="muted">{message}</p>
      </section>

      <div className="map-shell" ref={mapContainer} />

      <section className="panel">
        <div className="panel-title">
          <h2>Latest member locations</h2>
        </div>
        <div className="list">
          {locations.length ? (
            locations.map((location) => (
              <div className="list-row location-row" key={location.userId}>
                <div>
                  <strong>{location.name}</strong>
                  <small>
                    {new Date(location.createdAt).toLocaleString()} · accuracy{" "}
                    {location.accuracyMeters
                      ? `±${Math.round(location.accuracyMeters)}m`
                      : "unknown"}
                  </small>
                </div>
                <a
                  href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open map
                </a>
              </div>
            ))
          ) : (
            <p className="muted">No recent locations for this country.</p>
          )}
        </div>
      </section>
    </div>
  );
}
