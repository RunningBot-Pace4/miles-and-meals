"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { googleMapsPlaceKey, MAX_PLACES_FILE_BYTES, parseGoogleSavedPlaces, type SavedPlaceDraft } from "@/lib/google-saved-places";
import type { PlannerItem } from "@/lib/planner-types";
import styles from "./GooglePlacesImport.module.css";
import { distanceKm, placeCoordinates } from "@/lib/place-distance";
import { type GooglePlaceMatch } from "@/lib/google-places";
import { PlacePinPicker } from "@/components/PlacePinPicker";
import { TripStay } from "@/components/TripStay";

export function GooglePlacesImport({ countryId, tripName, existingLinks, disabled, onImported, stay, onStaySaved }: {
  countryId: string;
  tripName: string;
  existingLinks: Array<string | null>;
  disabled?: boolean;
  onImported: (items: PlannerItem[]) => void;
  stay?: PlannerItem;
  onStaySaved: () => Promise<void>;
}) {
  const panelId = useId();
  const [pinning, setPinning] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [places, setPlaces] = useState<SavedPlaceDraft[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [warnings, setWarnings] = useState<string[]>([]);
  const [duplicates, setDuplicates] = useState(0);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [nearestFirst, setNearestFirst] = useState(true);
  const [stayMatch, setStayMatch] = useState<GooglePlaceMatch | null>(null);
  const submitting = useRef(false);
  const readVersion = useRef(0);
  const existing = new Set(existingLinks.map((link) => link ? googleMapsPlaceKey(link) : null).filter(Boolean));
  const available = places.filter((place) => !existing.has(googleMapsPlaceKey(place.linkUrl)));
  const stayPoint = stayMatch ? { latitude: stayMatch.latitude, longitude: stayMatch.longitude } : null;
  const ordered = nearestFirst && stayPoint ? [...places].sort((a, b) => {
    if (!a.match) return b.match ? 1 : 0;
    if (!b.match) return -1;
    return distanceKm(stayPoint, a.match) - distanceKm(stayPoint, b.match);
  }) : places;
  const chosen = ordered.filter((place) => !existing.has(googleMapsPlaceKey(place.linkUrl)) && selected.has(place.linkUrl));
  const unavailable = places.filter((place) => existing.has(googleMapsPlaceKey(place.linkUrl))).length;

  function addGoogleLocation(place: SavedPlaceDraft, match: GooglePlaceMatch): SavedPlaceDraft {
    const cleanNotes = place.notes.replace(/(?:^|\n)Geoapify Place ID: [^\n]*/g, "").trim();
    const placeIdNote = `Geoapify Place ID: ${match.placeId}`;
    const notes = [cleanNotes, placeIdNote].filter(Boolean).join("\n");
    return { ...place, notes: notes.length <= 1000 ? notes : placeIdNote, match: { ...match } };
  }

  useEffect(() => {
    if (!open) return;
    if (!stay) { setStayMatch(null); return; }
    const point = placeCoordinates(stay.linkUrl ?? "", stay.notes ?? "");
    if (point) { setStayMatch({ ...point, title: stay.title, clientKey: "stay", matchedName: stay.title, formattedAddress: "Confirmed stay pin", placeId: "", googleMapsUri: "", confidence: "MATCHED" }); return; }
    setStayMatch(null);
    const controller = new AbortController();
    void fetch("/api/travel-items/resolve-places", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ countryId, places: [{ clientKey: "stay", title: stay?.title ?? "Accommodation" }] }),
      signal: controller.signal,
    }).then(async (response) => {
      const payload = await response.json() as { matches?: GooglePlaceMatch[] };
      if (response.ok) setStayMatch(payload.matches?.[0] ?? null);
    }).catch(() => undefined);
    return () => controller.abort();
  }, [countryId, open, stay?.notes, stay?.title]);

  async function resolveFromGoogle(input: SavedPlaceDraft[], version: number): Promise<SavedPlaceDraft[]> {
    const matches = new Map<string, GooglePlaceMatch>();
    const needsLookup = input.filter(place => !placeCoordinates(place.linkUrl, place.notes));
    for (let start = 0; start < needsLookup.length; start += 2) {
      const chunk = needsLookup.slice(start, start + 2);
      const response = await fetch("/api/travel-items/resolve-places", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ countryId, places: chunk.map((place) => ({ clientKey: place.linkUrl, title: place.title })) }),
        signal: AbortSignal.timeout(30_000),
      });
      const payload = await response.json() as { error?: string; matches?: GooglePlaceMatch[] };
      if (!response.ok) { setError("Location lookup unavailable. Your list can still be imported; use Set exact pin to add distances."); break; }
      for (const match of payload.matches ?? []) matches.set(match.clientKey, match);
      if (readVersion.current !== version) return [];
    }
    return input.map((place) => {
      const point = placeCoordinates(place.linkUrl, place.notes);
      if (point) return { ...place, notes: `Coordinates: ${point.latitude}, ${point.longitude}\n${place.notes}`.slice(0, 1000), match: { ...point, matchedName: place.title, formattedAddress: "Pin from imported data", googleMapsUri: "", placeId: "", confidence: "MATCHED" as const } };
      const match = matches.get(place.linkUrl);
      return match ? addGoogleLocation(place, match) : place;
    });
  }

  async function loadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const version = ++readVersion.current;
    setError(""); setMessage(""); setPlaces([]); setSelected(new Set()); setWarnings([]); setDuplicates(0); setFileName("");
    if (!/\.csv$/i.test(file.name) || file.size > MAX_PLACES_FILE_BYTES) {
      setError("Choose a Google Saved list CSV smaller than 1 MB.");
      return;
    }
    setReading(true);
    try {
      const result = parseGoogleSavedPlaces(await file.text());
      if (readVersion.current !== version) return;
      let resolved = result.places;
      try { resolved = await resolveFromGoogle(result.places, version); }
      catch { setError("Location lookup unavailable. You can still import the list and add pins."); }
      if (readVersion.current !== version) return;
      setFileName(file.name);
      setPlaces(resolved);
      setWarnings(result.warnings);
      setDuplicates(result.duplicateCount);
      setSelected(new Set(resolved.filter((place) => !existing.has(googleMapsPlaceKey(place.linkUrl))).map((place) => place.linkUrl)));
    } catch (caught) {
      if (readVersion.current === version) setError(caught instanceof Error ? caught.message : "Unable to read this CSV.");
    } finally {
      if (readVersion.current === version) setReading(false);
    }
  }

  async function save() {
    if (submitting.current || disabled || !chosen.length) return;
    if (!navigator.onLine) { setError("Connect to the internet to import. Your selection is still here."); return; }
    submitting.current = true;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/travel-items/import-places", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ countryId, places: chosen }),
        signal: AbortSignal.timeout(30_000),
      });
      const payload = await response.json() as { error?: string; items: PlannerItem[]; imported: number; skipped: number };
      if (!response.ok) throw new Error(payload.error ?? "Unable to import places.");
      onImported(payload.items);
      setMessage(`${payload.imported} ${payload.imported === 1 ? "item" : "items"} added to ${tripName}, split into Places, Meals and Shop by category.${payload.skipped ? ` ${payload.skipped} already saved and skipped.` : ""} You can add visit dates using Edit.`);
      setPlaces([]); setSelected(new Set()); setFileName(""); setWarnings([]); setDuplicates(0);
    } catch (caught) {
      setError(caught instanceof Error && caught.name !== "TimeoutError" && caught.name !== "TypeError"
        ? caught.message
        : "The import could not be confirmed. Try again when connected; already saved places will be skipped.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return <section className={styles.card} aria-label="Import saved places">
    <TripStay countryId={countryId} stay={stay} disabled={disabled || busy} onSaved={onStaySaved} onMatched={setStayMatch} />
    <div className={styles.intro}>
      <span className={styles.icon} aria-hidden="true">↗</span>
      <div className={styles.introText}><h3>Your saved spots, together</h3><p>One list for Places, Meals and Shop.</p></div>
      <button className="button secondary" type="button" aria-expanded={open} aria-controls={panelId} disabled={disabled || busy || reading} onClick={() => setOpen((value) => !value)}>
        {open ? "Close import" : "Import Google list"}
      </button>
    </div>
    {open ? <div id={panelId} className={styles.panel} aria-busy={busy || reading}>
      <div className={styles.destination}><span>Save places to</span><strong>{tripName}</strong><small>Use the Trip selector above to choose a different trip before uploading.</small></div>
      <label className={styles.file}>
        <strong>{reading ? "Reading your list…" : "Choose your saved-list CSV"}</strong>
        <span>{reading ? "Finding each location using open map data…" : "Google Takeout → Saved · up to 250 places · 1 MB"}</span>
        <input aria-label="Google saved places CSV" type="file" accept=".csv,text/csv" disabled={busy || reading || disabled} onChange={(event) => void loadFile(event)} />
      </label>
      <p className={styles.hint}>Add a Category column to your CSV: Place, Meals or Shop. Blank categories go to Places. The app automatically checks every name using open map data, then sorts from your accommodation. This is a one-time import.</p>
      {places.length ? <>
        <div className={styles.reviewHeader}>
          <div><h4>{places.length} places found</h4><p>{fileName}</p></div>
          <button className="button secondary" type="button" disabled={busy || disabled || !available.length} onClick={() => setSelected(chosen.length === available.length ? new Set() : new Set(available.map((place) => place.linkUrl)))}>
            {chosen.length === available.length && available.length ? "Deselect all" : "Select all"}
          </button>
        </div>
        {unavailable || duplicates ? <p className={styles.hint}>{unavailable ? `${unavailable} already in this trip. ` : ""}{duplicates ? `${duplicates} repeated entries removed from the file. ` : ""}Existing places are kept unchanged.</p> : null}
        <p className={styles.hint}>{chosen.filter((p) => !p.itemType || p.itemType === "PLACE").length} Places · {chosen.filter((p) => p.itemType === "FOOD").length} Meals · {chosen.filter((p) => p.itemType === "SHOPPING").length} Shop</p>
        <label className={styles.sort}><input type="checkbox" disabled={!stayPoint || busy} checked={nearestFirst && !!stayPoint} onChange={(event) => setNearestFirst(event.target.checked)} /> Nearest to accommodation first</label>
        <p className={styles.hint}>{stayPoint ? `${places.filter((p) => p.match).length} of ${places.length} locations matched. Straight-line distance; unmatched locations stay last. Order is saved within each tab.` : "Save your accommodation above to enable automatic nearest-to-farthest sorting."}</p>
        <ul className={styles.list} aria-label="Places to import">
          {ordered.map((place) => {
            const saved = existing.has(googleMapsPlaceKey(place.linkUrl));
            const point = place.match ? { latitude: place.match.latitude, longitude: place.match.longitude } : null;
            return <li key={place.linkUrl} className={saved ? styles.saved : undefined}>
              <label className={styles.place}>
                <input type="checkbox" checked={!saved && selected.has(place.linkUrl)} disabled={saved || busy || disabled} onChange={(event) => {
                  const checked = event.target.checked;
                  setSelected((current) => { const next = new Set(current); if (checked) next.add(place.linkUrl); else next.delete(place.linkUrl); return next; });
                }} />
                <span><strong>{place.title}</strong>{place.match ? <><small>{place.match.matchedName} · {place.match.formattedAddress}</small><small><span className={place.match.confidence === "MATCHED" ? styles.match : styles.check}>{place.match.confidence === "MATCHED" ? " · Matched" : " · Check this match"}</span></small></> : <small className={styles.missing}>Location not matched · you can still import this place and add a pin</small>}{saved ? <small className={styles.savedLabel}>Already saved</small> : null}</span>
              </label>
              <div className={styles.rowFields}>
                <label>Category<select aria-label={`Category for ${place.title}`} value={place.itemType ?? "PLACE"} disabled={saved || busy} onChange={(event) => setPlaces((current) => current.map((p) => p.linkUrl === place.linkUrl ? { ...p, itemType: event.target.value as SavedPlaceDraft["itemType"] } : p))}><option value="PLACE">Places</option><option value="FOOD">Meals</option><option value="SHOPPING">Shop</option></select></label>
                <small>{stayPoint && point ? `${distanceKm(stayPoint, point).toFixed(2)} km from stay` : "Distance unavailable"}</small>
              </div>
              <button type="button" className="button secondary" disabled={busy || saved} onClick={() => setPinning(place.linkUrl)}>Set exact pin</button>
              {pinning === place.linkUrl ? <PlacePinPicker initial={place.match ?? stayPoint} onCancel={() => setPinning(null)} onChoose={point => {
                setPlaces(current => current.map(p => p.linkUrl === place.linkUrl ? { ...p, notes: `Coordinates: ${point.latitude}, ${point.longitude}\n${p.notes.replace(/(?:^|\n)Coordinates: [^\n]*/g, "").trim()}`.slice(0, 1000), match: { ...point, matchedName: p.title, formattedAddress: "Pin selected by you", googleMapsUri: "", placeId: "", confidence: "MATCHED" } } : p));
                setPinning(null);
              }} /> : null}
              <a href={place.linkUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${place.title} in Google Maps`}>Map ↗</a>
            </li>;
          })}
        </ul>
        {warnings.length ? <div className={styles.warnings} role="status"><strong>{warnings.length} records need attention</strong><ul>{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div> : null}
        <div className={styles.footer}>
          <p><strong>{chosen.length} selected</strong><span>Saved to {tripName} · no dates assigned</span></p>
          <button className="button primary" type="button" disabled={busy || disabled || !chosen.length} onClick={() => void save()}>
            {busy ? "Saving places…" : available.length ? `Save ${chosen.length} ${chosen.length === 1 ? "place" : "places"}` : "All places already saved"}
          </button>
        </div>
      </> : null}
      {message ? <p className={styles.success} role="status">{message}</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </div> : null}
  </section>;
}
