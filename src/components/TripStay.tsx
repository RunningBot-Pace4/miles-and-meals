"use client";
import { useRef, useState } from "react";
import type { PlannerItem } from "@/lib/planner-types";
import type { GooglePlaceMatch } from "@/lib/google-places";
import { placeCoordinates } from "@/lib/place-distance";
import { PlacePinPicker } from "@/components/PlacePinPicker";
import styles from "./GooglePlacesImport.module.css";

export function TripStay({ countryId, stay, disabled, onSaved, onMatched }: { countryId: string; stay?: PlannerItem; disabled?: boolean; onSaved: () => Promise<void>; onMatched: (match: GooglePlaceMatch) => void }) {
  const [pinning, setPinning] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(stay?.title ?? "");
  const [query, setQuery] = useState("");
  const [match, setMatch] = useState<GooglePlaceMatch | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const requestKey = useRef<{ value: string; id: string } | null>(null);
  async function find() {
    if (busy || disabled) return;
    setBusy(true); setError(""); setMatch(null);
    try {
      const point = placeCoordinates(query);
      if (point) {
        setMatch({ ...point, clientKey: "stay", title: name || "My stay", matchedName: name || "Selected map pin", formattedAddress: "Location from your map link. Check the pin before saving.", placeId: "", googleMapsUri: "", confidence: "CHECK" });
        return;
      }
      if (/^https?:/i.test(query)) throw new Error("This link does not contain a precise pin. Open it in your browser and copy the full place URL, or search the street address below.");
      const response = await fetch("/api/travel-items/resolve-places", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ countryId, places: [{ clientKey: "stay", title: query.trim() }] }), signal: AbortSignal.timeout(20000) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Search is temporarily unavailable.");
      if (!data.matches?.[0]) throw new Error("No precise location found. Try the building name or street address, or paste a full map-pin link.");
      setMatch(data.matches[0]);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to find location."); }
    finally { setBusy(false); }
  }
  async function save() {
    if (!match || busy || disabled) return;
    setBusy(true); setError("");
    try {
      const title = name.trim() || match.matchedName;
      const point = `${match.latitude}, ${match.longitude}`;
      const key = JSON.stringify([countryId, title, point]);
      if (requestKey.current?.value !== key) requestKey.current = { value: key, id: crypto.randomUUID() };
      const preserved = stay ? Object.fromEntries(Object.entries(stay).map(([key, value]) => [key, value ?? ""])) : {};
      const response = await fetch(stay ? `/api/travel-items/${stay.id}` : "/api/travel-items", {
        method: stay ? "PATCH" : "POST", headers: { "content-type": "application/json", "x-mnm-offline-mutation-id": requestKey.current.id },
        body: JSON.stringify({ ...preserved, countryId, title, itemType: "ITINERARY", subtype: "Accommodation", provider: "Miles & Meals stay", linkUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(point)}`, notes: `Coordinates: ${point}\nLocation confirmed by traveler`, ...(stay ? { expectedUpdatedAt: stay.updatedAt } : { status: "Planned", sortOrder: 0 }) }), signal: AbortSignal.timeout(30000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save stay.");
      onMatched(match); await onSaved(); setEditing(false); setMessage("Stay saved. Place distances use your confirmed pin.");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save stay."); }
    finally { setBusy(false); }
  }
  return <div className={styles.stay}>
    <div className={styles.reviewHeader}><div><h3>Your stay</h3><p>{stay?.title || "Where will your day start?"}</p></div><button className="button secondary" type="button" disabled={disabled || busy} onClick={() => { setEditing(!editing); setName(stay?.title ?? ""); setMatch(null); setError(""); setMessage(""); }}>{editing ? "Cancel" : stay ? "Change stay" : "Add stay"}</button></div>
    {editing ? <form className={styles.stayForm} onSubmit={event => { event.preventDefault(); void find(); }}>
      <label>Stay name · optional<input value={name} maxLength={250} onChange={event => setName(event.target.value)} placeholder="e.g. Tin Hau apartment" disabled={busy} /></label>
      <label>Find your location<input value={query} required maxLength={1000} onChange={event => { setQuery(event.target.value); setMatch(null); setError(""); }} placeholder="Hotel, street address or full map-pin link" disabled={busy} /></label>
      <p className={styles.hint}>For an apartment, search the building or street address. Your stay name can be anything you like.</p>
      <button className="button secondary" disabled={busy || disabled || !query.trim()} type="submit">{busy ? "Please wait…" : "Find location"}</button>
      <button className="button secondary" type="button" disabled={busy} onClick={() => setPinning(true)}>Choose pin on map</button>
      {pinning ? <PlacePinPicker initial={match ?? placeCoordinates(stay?.linkUrl ?? "", stay?.notes ?? "")} onCancel={() => setPinning(false)} onChoose={point => { setMatch({ ...point, clientKey: "stay", title: name || "My stay", matchedName: name || "Selected pin", formattedAddress: "Exact pin selected by you", placeId: "", googleMapsUri: "", confidence: "MATCHED" }); setPinning(false); setError(""); }} /> : null}
      {match ? <div className={styles.stayPreview}>
        <strong>Is this the right location?</strong><p>{match.matchedName}</p><p>{match.formattedAddress}</p>
        <a href={`https://www.openstreetmap.org/?mlat=${match.latitude}&mlon=${match.longitude}#map=18/${match.latitude}/${match.longitude}`} target="_blank" rel="noreferrer">Check pin on map ↗</a>
        <p className={styles.hint}>Check the building before confirming. All distances will start at this pin.</p>
        <button type="button" className="button primary" disabled={busy || disabled} onClick={() => void save()}>Use this location &amp; save stay</button>
      </div> : null}
    </form> : null}
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    {message ? <p role="status">{message}</p> : null}

  </div>;
}
