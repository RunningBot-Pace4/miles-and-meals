"use client";

import { useId, useRef, useState, type ChangeEvent } from "react";
import { googleMapsPlaceKey, MAX_PLACES_FILE_BYTES, parseGoogleSavedPlaces, type SavedPlaceDraft } from "@/lib/google-saved-places";
import type { PlannerItem } from "@/lib/planner-types";
import styles from "./GooglePlacesImport.module.css";

export function GooglePlacesImport({ countryId, tripName, existingLinks, disabled, onImported }: {
  countryId: string;
  tripName: string;
  existingLinks: Array<string | null>;
  disabled?: boolean;
  onImported: (items: PlannerItem[]) => void;
}) {
  const panelId = useId();
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
  const submitting = useRef(false);
  const readVersion = useRef(0);
  const existing = new Set(existingLinks.map((link) => link ? googleMapsPlaceKey(link) : null).filter(Boolean));
  const available = places.filter((place) => !existing.has(googleMapsPlaceKey(place.linkUrl)));
  const chosen = available.filter((place) => selected.has(place.linkUrl));
  const unavailable = places.length - available.length;

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
      setFileName(file.name);
      setPlaces(result.places);
      setWarnings(result.warnings);
      setDuplicates(result.duplicateCount);
      setSelected(new Set(result.places.filter((place) => !existing.has(googleMapsPlaceKey(place.linkUrl))).map((place) => place.linkUrl)));
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
      setMessage(`${payload.imported} ${payload.imported === 1 ? "place" : "places"} added to ${tripName}.${payload.skipped ? ` ${payload.skipped} already saved and skipped.` : ""} You can add visit dates from each place's Edit button.`);
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
    <div className={styles.intro}>
      <span className={styles.icon} aria-hidden="true">↗</span>
      <div className={styles.introText}><h3>Your saved spots, together</h3><p>Bring a Google Maps list into your trip.</p></div>
      <button className="button secondary" type="button" aria-expanded={open} aria-controls={panelId} disabled={disabled || busy || reading} onClick={() => setOpen((value) => !value)}>
        {open ? "Close import" : "Import Google list"}
      </button>
    </div>
    {open ? <div id={panelId} className={styles.panel} aria-busy={busy || reading}>
      <div className={styles.destination}><span>Save places to</span><strong>{tripName}</strong><small>Use the Trip selector above to choose a different trip before uploading.</small></div>
      <label className={styles.file}>
        <strong>{reading ? "Reading your list…" : "Choose your saved-list CSV"}</strong>
        <span>Google Takeout → Saved · up to 250 places · 1 MB</span>
        <input aria-label="Google saved places CSV" type="file" accept=".csv,text/csv" disabled={busy || reading || disabled} onChange={(event) => void loadFile(event)} />
      </label>
      {!places.length && !message ? <p className={styles.hint}>Preview first, then save. Names, notes and Google Maps links are copied; visit dates stay empty. This is a one-time import, not a live sync.</p> : null}
      {places.length ? <>
        <div className={styles.reviewHeader}>
          <div><h4>{places.length} places found</h4><p>{fileName}</p></div>
          <button className="button secondary" type="button" disabled={busy || disabled || !available.length} onClick={() => setSelected(chosen.length === available.length ? new Set() : new Set(available.map((place) => place.linkUrl)))}>
            {chosen.length === available.length && available.length ? "Deselect all" : "Select all"}
          </button>
        </div>
        {unavailable || duplicates ? <p className={styles.hint}>{unavailable ? `${unavailable} already in this trip. ` : ""}{duplicates ? `${duplicates} repeated entries removed from the file. ` : ""}Existing places are kept unchanged.</p> : null}
        <ul className={styles.list} aria-label="Places to import">
          {places.map((place) => {
            const saved = existing.has(googleMapsPlaceKey(place.linkUrl));
            return <li key={place.linkUrl} className={saved ? styles.saved : undefined}>
              <label className={styles.place}>
                <input type="checkbox" checked={!saved && selected.has(place.linkUrl)} disabled={saved || busy || disabled} onChange={(event) => {
                  const checked = event.target.checked;
                  setSelected((current) => { const next = new Set(current); if (checked) next.add(place.linkUrl); else next.delete(place.linkUrl); return next; });
                }} />
                <span><strong>{place.title}</strong>{place.notes ? <small>{place.notes}</small> : null}{saved ? <small className={styles.savedLabel}>Already saved</small> : null}</span>
              </label>
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
