"use client";
import { useRef, useState } from "react";
import type { PlannerItem } from "@/lib/planner-types";
import { googlePlaceId, type GooglePlaceMatch } from "@/lib/google-places";
import styles from "./GooglePlacesImport.module.css";

export function TripStay({ countryId, stay, disabled, onSaved, onMatched }: { countryId: string; stay?: PlannerItem; disabled?: boolean; onSaved: () => Promise<void>; onMatched: (match: GooglePlaceMatch) => void }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const requestKey = useRef<{ value: string; id: string } | null>(null);
  const savedPlaceId = googlePlaceId(stay?.notes);
  return <div className={styles.stay}>
    <div className={styles.reviewHeader}><div><h3>Your accommodation</h3><p>{stay?.title ?? "Set a starting point for this trip"}</p></div><button type="button" className="button secondary" disabled={disabled || busy} onClick={() => { setEditing(!editing); setMessage(""); }}>{editing ? "Close" : stay ? "Edit stay" : "Add stay"}</button></div>
    {editing ? <form className={styles.stayForm} key={stay?.updatedAt ?? "new"} onSubmit={async (event) => {
      event.preventDefault();
      if (busy || disabled) return;
      const data = new FormData(event.currentTarget);
      const stayName = String(data.get("name")).trim();
      setBusy(true); setMessage("");
      try {
        const lookupResponse = await fetch("/api/travel-items/resolve-places", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ countryId, places: [{ clientKey: "stay", title: stayName }] }),
          signal: AbortSignal.timeout(20_000),
        });
        const lookupPayload = await lookupResponse.json() as { error?: string; matches?: GooglePlaceMatch[] };
        if (!lookupResponse.ok) throw new Error(lookupPayload.error ?? "Unable to find this accommodation on Google Maps.");
        const match = lookupPayload.matches?.[0];
        if (!match) throw new Error("Accommodation not found on Google Maps. Check the full hotel name and try again.");
        const preserved = stay ? Object.fromEntries(Object.entries(stay).map(([key, value]) => [key, value ?? ""])) : {};
        const key = JSON.stringify([countryId, stayName, match.placeId]);
        if (requestKey.current?.value !== key) requestKey.current = { value: key, id: crypto.randomUUID() };
        const response = await fetch(stay ? `/api/travel-items/${stay.id}` : "/api/travel-items", {
          method: stay ? "PATCH" : "POST", headers: { "content-type": "application/json", "x-mnm-offline-mutation-id": requestKey.current.id },
          body: JSON.stringify({ ...preserved, countryId, title: stayName, itemType: "ITINERARY", subtype: "Accommodation", provider: "Miles & Meals stay", linkUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stayName)}&query_place_id=${encodeURIComponent(match.placeId)}`, notes: `Google Place ID: ${match.placeId}`, ...(stay ? { expectedUpdatedAt: stay.updatedAt } : { status: "Planned", sortOrder: 0 }) }),
          signal: AbortSignal.timeout(30_000),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Unable to save your stay.");
        onMatched(match); await onSaved(); setEditing(false); setMessage(`${match.matchedName} matched on Google Maps and saved. Distances will use this location.`);
      } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save your stay."); }
      finally { setBusy(false); }
    }}>
      <label>Hotel / accommodation<input name="name" required maxLength={250} defaultValue={stay?.title ?? ""} placeholder="Where are you staying?" /></label>
      {savedPlaceId ? <p className={styles.hint}>Google Maps match saved. Its current location is checked again whenever you import.</p> : null}
      <p className={styles.hint}>Enter the full Google Maps hotel or accommodation name. Miles & Meals will find its location automatically.</p>
      <button className="button primary" disabled={busy || disabled} type="submit">{busy ? "Saving…" : "Save accommodation"}</button>
    </form> : null}
    {message ? <p role="status">{message}</p> : null}
  </div>;
}
