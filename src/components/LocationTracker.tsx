"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  Map as MapLibreMap,
  Marker as MapLibreMarker,
} from "maplibre-gl";
import { SavingOverlay } from "@/components/SavingOverlay";

type CountryOption = {
  id: string;
  name: string;
  tripName: string;
};

type MemberLocation = {
  userId: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
  createdAt: string | null;
};

type LocationsResponse = {
  locations: MemberLocation[];
  serverTime: string;
};

type SavedLocationResponse = {
  ok: boolean;
  location: {
    userId: string;
    latitude: number;
    longitude: number;
    accuracyMeters: number | null;
    createdAt: string;
  };
};

type LocationFreshness = "live" | "recent" | "stale" | "none";

const HEARTBEAT_MS = 15_000;
const REFRESH_MS = 5_000;
const LIVE_THRESHOLD_MS = 45_000;
const RECENT_THRESHOLD_MS = 5 * 60_000;

function getFreshness(
  createdAt: string | null,
  now: number,
): LocationFreshness {
  if (!createdAt) {
    return "none";
  }

  const age = Math.max(0, now - new Date(createdAt).getTime());

  if (age <= LIVE_THRESHOLD_MS) {
    return "live";
  }

  if (age <= RECENT_THRESHOLD_MS) {
    return "recent";
  }

  return "stale";
}

function formatAge(createdAt: string | null, now: number): string {
  if (!createdAt) {
    return "Not sharing yet";
  }

  const seconds = Math.max(
    0,
    Math.floor((now - new Date(createdAt).getTime()) / 1000),
  );

  if (seconds < 10) {
    return "Just now";
  }

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.floor(hours / 24)}d ago`;
}

function getGpsErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return (
        "Location permission was denied. Allow Location for Miles & Meals " +
        "in your browser/phone settings, then try again."
      );
    case error.POSITION_UNAVAILABLE:
      return "Your phone could not determine its current location.";
    case error.TIMEOUT:
      return "GPS took too long to respond. Try again in an open area.";
    default:
      return error.message || "Unable to read your GPS location.";
  }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function LocationTracker({
  countries,
  currentUserId,
}: {
  countries: CountryOption[];
  currentUserId: string;
}) {
  const [countryId, setCountryId] = useState(countries[0]?.id ?? "");
  const [sharing, setSharing] = useState(false);
  const [locating, setLocating] = useState(false);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [secureContext, setSecureContext] = useState(true);
  const [gpsMessage, setGpsMessage] = useState(
    "Live sharing is off.",
  );
  const [syncError, setSyncError] = useState("");
  const [locations, setLocations] = useState<MemberLocation[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState("");
  const [lastUploadedAt, setLastUploadedAt] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const watchId = useRef<number | null>(null);
  const heartbeatId = useRef<number | null>(null);
  const latestPosition = useRef<GeolocationPosition | null>(null);
  const sending = useRef(false);
  const lastSentAt = useRef(0);
  const shouldFitMap = useRef(true);

  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markers = useRef<Map<string, MapLibreMarker>>(new Map());

  useEffect(() => {
    setSecureContext(window.isSecureContext);
  }, []);

  const locatedMembers = useMemo(
    () =>
      locations.filter(
        (location) =>
          location.latitude !== null &&
          location.longitude !== null,
      ),
    [locations],
  );

  const refreshLocations = useCallback(async () => {
    if (!countryId) {
      setLocations([]);
      return;
    }

    const response = await fetch(
      `/api/locations?countryId=${encodeURIComponent(countryId)}`,
      {
        cache: "no-store",
      },
    );

    const payload = (await response.json().catch(() => null)) as
      | LocationsResponse
      | { error?: string }
      | null;

    if (!response.ok) {
      throw new Error(
        payload && "error" in payload && payload.error
          ? payload.error
          : "Unable to load member locations.",
      );
    }

    const data = payload as LocationsResponse;
    setLocations(data.locations);
    setSyncError("");
  }, [countryId]);

  const sendPosition = useCallback(
    async (position: GeolocationPosition) => {
      if (!countryId || sending.current) {
        return;
      }

      sending.current = true;

      try {
        const response = await fetch("/api/location", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            countryId,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyMeters: position.coords.accuracy,
          }),
        });

        const payload = (await response.json().catch(() => null)) as
          | SavedLocationResponse
          | { error?: string }
          | null;

        if (!response.ok) {
          throw new Error(
            payload && "error" in payload && payload.error
              ? payload.error
              : "Unable to save your location.",
          );
        }

        const saved = payload as SavedLocationResponse;
        const uploadedAt = new Date(
          saved.location.createdAt,
        ).toISOString();

        lastSentAt.current = Date.now();
        setLastUploadedAt(uploadedAt);
        setGpsMessage("Live location shared.");
        setSyncError("");
        setLocating(false);

        shouldFitMap.current = true;
        await refreshLocations();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to save your location.";

        setSyncError(message);
        setLocating(false);
      } finally {
        sending.current = false;
      }
    },
    [countryId, refreshLocations],
  );

  const clearSharingResources = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation?.clearWatch(watchId.current);
      watchId.current = null;
    }

    if (heartbeatId.current !== null) {
      window.clearInterval(heartbeatId.current);
      heartbeatId.current = null;
    }

    latestPosition.current = null;
  }, []);

  const stopSharing = useCallback(
    (showMessage = true) => {
      clearSharingResources();
      setSharing(false);
      setLocating(false);

      if (showMessage) {
        setGpsMessage(
          "Sharing stopped. Your last saved position remains visible as “last seen”.",
        );
      }
    },
    [clearSharingResources],
  );

  const startSharing = useCallback(() => {
    if (!secureContext) {
      setGpsMessage(
        "Live GPS requires HTTPS. Open the deployed Vercel site on your phone.",
      );
      return;
    }

    if (!navigator.geolocation) {
      setGpsMessage("This browser does not support GPS location.");
      return;
    }

    if (!countryId) {
      setGpsMessage("Choose a country first.");
      return;
    }

    clearSharingResources();
    setSyncError("");
    setGpsMessage("Waiting for a GPS fix…");
    setSharing(true);
    setLocating(true);
    lastSentAt.current = 0;

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        latestPosition.current = position;

        if (Date.now() - lastSentAt.current >= 5_000) {
          void sendPosition(position);
        }
      },
      (error) => {
        clearSharingResources();
        setSharing(false);
        setLocating(false);
        setGpsMessage(getGpsErrorMessage(error));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5_000,
        timeout: 20_000,
      },
    );

    heartbeatId.current = window.setInterval(() => {
      const position = latestPosition.current;

      if (position) {
        void sendPosition(position);
      }
    }, HEARTBEAT_MS);
  }, [
    clearSharingResources,
    countryId,
    secureContext,
    sendPosition,
  ]);

  const manualRefresh = useCallback(async () => {
    setManualRefreshing(true);

    try {
      await refreshLocations();
    } catch (error) {
      setSyncError(
        error instanceof Error
          ? error.message
          : "Unable to refresh locations.",
      );
    } finally {
      setManualRefreshing(false);
    }
  }, [refreshLocations]);

  const fitEveryone = useCallback(() => {
    const map = mapRef.current;

    if (!map || locatedMembers.length === 0) {
      return;
    }

    if (locatedMembers.length === 1) {
      const only = locatedMembers[0];

      map.easeTo({
        center: [only.longitude!, only.latitude!],
        zoom: 15,
        duration: 500,
      });

      return;
    }

    void import("maplibre-gl").then((maplibre) => {
      const bounds = new maplibre.LngLatBounds();

      for (const location of locatedMembers) {
        bounds.extend([
          location.longitude!,
          location.latitude!,
        ]);
      }

      map.fitBounds(bounds, {
        padding: 70,
        maxZoom: 15,
        duration: 500,
      });
    });
  }, [locatedMembers]);

  useEffect(() => {
    shouldFitMap.current = true;

    refreshLocations().catch((error: unknown) => {
      setSyncError(
        error instanceof Error
          ? error.message
          : "Unable to load live locations.",
      );
    });

    const timer = window.setInterval(() => {
      refreshLocations().catch((error: unknown) => {
        setSyncError(
          error instanceof Error
            ? error.message
            : "Unable to refresh live locations.",
        );
      });
    }, REFRESH_MS);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshLocations().catch(() => undefined);
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibility,
    );

    return () => {
      window.clearInterval(timer);
      document.removeEventListener(
        "visibilitychange",
        handleVisibility,
      );
    };
  }, [refreshLocations]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 10_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!mapContainer.current) {
      return;
    }

    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    async function setupMap() {
      const maplibre = await import("maplibre-gl");

      maplibre.setWorkerUrl(
        "/maplibre/maplibre-gl-worker.mjs",
      );

      const container = mapContainer.current;

      if (
        cancelled ||
        !container ||
        mapRef.current
      ) {
        return;
      }

      const map = new maplibre.Map({
        container,
        style: "https://tiles.openfreemap.org/styles/liberty",
        center: [101.6869, 3.139],
        zoom: 4,
      });

      mapRef.current = map;
      map.addControl(
        new maplibre.NavigationControl(),
        "top-right",
      );

      const loadTimeout = window.setTimeout(() => {
        if (!cancelled && !map.loaded()) {
          setMapError(
            "The map could not finish loading. Refresh the page. If this continues, check the browser console for a MapLibre worker or tile error.",
          );
        }
      }, 12_000);

      map.once("load", () => {
        window.clearTimeout(loadTimeout);

        if (cancelled) {
          return;
        }

        setMapReady(true);
        setMapError("");
        map.resize();
      });

      map.on("error", (event) => {
        if (!cancelled) {
          const detail =
            event.error instanceof Error
              ? event.error.message
              : "Unknown map error.";

          console.error("[Miles & Meals] MapLibre error:", event.error);
          setMapError(
            `The map could not load: ${detail}`,
          );
        }
      });

      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => {
          map.resize();
        });

        resizeObserver.observe(container);
      }
    }

    setupMap().catch((error: unknown) => {
      setMapError(
        error instanceof Error
          ? `Map could not be loaded: ${error.message}`
          : "Map could not be loaded.",
      );
    });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();

      for (const marker of markers.current.values()) {
        marker.remove();
      }

      markers.current.clear();
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
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

      const activeIds = new Set(
        locatedMembers.map((location) => location.userId),
      );

      for (const [userId, marker] of markers.current.entries()) {
        if (!activeIds.has(userId)) {
          marker.remove();
          markers.current.delete(userId);
        }
      }

      for (const location of locatedMembers) {
        const freshness = getFreshness(location.createdAt, now);
        let marker = markers.current.get(location.userId);

        if (!marker) {
          const element = document.createElement("button");
          element.type = "button";
          element.className = `map-marker map-marker-${freshness}`;
          element.textContent = initials(location.name);
          element.setAttribute(
            "aria-label",
            `${location.name} location`,
          );

          marker = new maplibre.Marker({ element })
            .setLngLat([
              location.longitude!,
              location.latitude!,
            ])
            .addTo(map);

          markers.current.set(location.userId, marker);
        } else {
          marker.setLngLat([
            location.longitude!,
            location.latitude!,
          ]);
          marker.getElement().className =
            `map-marker map-marker-${freshness}`;
        }

        const popupText = [
          location.name,
          formatAge(location.createdAt, now),
          location.accuracyMeters
            ? `Accuracy ±${Math.round(location.accuracyMeters)}m`
            : null,
        ]
          .filter(Boolean)
          .join(" · ");

        marker.setPopup(
          new maplibre.Popup({ offset: 20 }).setText(popupText),
        );
      }

      if (shouldFitMap.current && locatedMembers.length > 0) {
        shouldFitMap.current = false;

        if (locatedMembers.length === 1) {
          const only = locatedMembers[0];

          map.easeTo({
            center: [only.longitude!, only.latitude!],
            zoom: 15,
            duration: 500,
          });
        } else {
          const bounds = new maplibre.LngLatBounds();

          for (const location of locatedMembers) {
            bounds.extend([
              location.longitude!,
              location.latitude!,
            ]);
          }

          map.fitBounds(bounds, {
            padding: 70,
            maxZoom: 15,
            duration: 500,
          });
        }
      }
    }

    syncMarkers().catch((error: unknown) => {
      setMapError(
        error instanceof Error
          ? `Unable to draw member markers: ${error.message}`
          : "Unable to draw member markers.",
      );
    });

    return () => {
      cancelled = true;
    };
  }, [locatedMembers, now]);

  useEffect(() => {
    return () => {
      clearSharingResources();
    };
  }, [clearSharingResources]);

  return (
    <div className="stack gap-lg">
      {locating ? (
        <SavingOverlay
          title="Finding your location"
          message="Getting a GPS fix and sharing it with your travel crew."
        />
      ) : manualRefreshing ? (
        <SavingOverlay
          title="Refreshing live locations"
          message="Checking the latest positions for your travel crew."
        />
      ) : null}
      <section className="panel live-location-control">
        <div className="live-location-control-top">
          <label className="live-location-country">
            Country
            <select
              value={countryId}
              onChange={(event) => {
                stopSharing(false);
                shouldFitMap.current = true;
                setCountryId(event.target.value);
                setLastUploadedAt(null);
                setGpsMessage("Live sharing is off.");
              }}
            >
              {countries.map((country) => (
                <option value={country.id} key={country.id}>
                  {country.name}
                </option>
              ))}
            </select>
          </label>

          <div className="live-location-actions">
            <button
              className={
                sharing
                  ? "button danger-button"
                  : "button primary"
              }
              type="button"
              onClick={() => {
                if (sharing) {
                  stopSharing();
                } else {
                  startSharing();
                }
              }}
            >
              {sharing
                ? "■ Stop live sharing"
                : "● Share live location"}
            </button>

            <button
              className="button secondary"
              type="button"
              onClick={() => void manualRefresh()}
              disabled={manualRefreshing}
            >
              ↻ Refresh
            </button>

            <button
              className="button secondary"
              type="button"
              disabled={locatedMembers.length === 0}
              onClick={fitEveryone}
            >
              ⌖ Fit everyone
            </button>
          </div>
        </div>

        <div className="live-location-status-grid">
          <div className="location-status-tile">
            <span className={sharing ? "status-dot live" : "status-dot"} />
            <div>
              <small>Sharing</small>
              <strong>{sharing ? "Active" : "Off"}</strong>
            </div>
          </div>

          <div className="location-status-tile">
            <span
              className={
                secureContext
                  ? "status-dot live"
                  : "status-dot warning"
              }
            />
            <div>
              <small>Connection</small>
              <strong>
                {secureContext ? "Secure HTTPS" : "HTTPS required"}
              </strong>
            </div>
          </div>

          <div className="location-status-tile">
            <span
              className={
                lastUploadedAt
                  ? "status-dot live"
                  : "status-dot"
              }
            />
            <div>
              <small>Last upload</small>
              <strong>
                {lastUploadedAt
                  ? formatAge(lastUploadedAt, now)
                  : "Not yet"}
              </strong>
            </div>
          </div>
        </div>

        <p className="location-help-text">{gpsMessage}</p>

        {syncError ? (
          <p className="error-text" role="alert">
            {syncError}
          </p>
        ) : null}
      </section>

      <section className="live-map-panel">
        <div className="map-shell map-shell-live" ref={mapContainer} />

        {!mapReady && !mapError ? (
          <div className="map-state-overlay">
            <div className="mini-spinner" />
            <strong>Loading map…</strong>
          </div>
        ) : null}

        {mapError ? (
          <div className="map-error-banner" role="alert">
            {mapError}
          </div>
        ) : null}
      </section>

      <section className="panel">
        <div className="panel-title live-member-heading">
          <div>
            <p className="eyebrow">TRIP CREW</p>
            <h2>Latest member locations</h2>
          </div>
          <span className="member-count">
            {locatedMembers.length}/{locations.length} located
          </span>
        </div>

        <div className="live-member-grid">
          {locations.map((location) => {
            const freshness = getFreshness(
              location.createdAt,
              now,
            );
            const hasLocation =
              location.latitude !== null &&
              location.longitude !== null;

            return (
              <article
                className={`live-member-card live-member-${freshness}`}
                key={location.userId}
              >
                <div className="live-member-avatar">
                  {initials(location.name)}
                </div>

                <div className="live-member-main">
                  <div className="live-member-name-row">
                    <strong>
                      {location.name}
                      {location.userId === currentUserId
                        ? " (You)"
                        : ""}
                    </strong>

                    <span className={`freshness-badge ${freshness}`}>
                      {freshness === "live"
                        ? "● Live"
                        : freshness === "recent"
                          ? "Recent"
                          : freshness === "stale"
                            ? "Last seen"
                            : "Not sharing"}
                    </span>
                  </div>

                  <span className="muted">
                    {formatAge(location.createdAt, now)}
                    {location.accuracyMeters
                      ? ` · accuracy ±${Math.round(
                          location.accuracyMeters,
                        )}m`
                      : ""}
                  </span>

                  {hasLocation ? (
                    <small className="coordinate-text">
                      {location.latitude!.toFixed(5)},{" "}
                      {location.longitude!.toFixed(5)}
                    </small>
                  ) : (
                    <small className="coordinate-text">
                      Ask this traveler to press “Share live location”.
                    </small>
                  )}
                </div>

                {hasLocation ? (
                  <a
                    className="button secondary location-open-button"
                    href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open map
                  </a>
                ) : null}
              </article>
            );
          })}

          {locations.length === 0 ? (
            <div className="empty-card">
              <h3>No travelers assigned yet</h3>
              <p>
                Assign travelers to this country in Admin before using the
                live map.
              </p>
            </div>
          ) : null}
        </div>
      </section>

    </div>
  );
}
