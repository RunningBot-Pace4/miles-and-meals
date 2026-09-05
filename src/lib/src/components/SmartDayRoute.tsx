"use client";

import { useEffect, useMemo, useState } from "react";
import { analyzeDayRoute, dayRouteUrl, type SmartRouteItem, type TravelMode } from "@/lib/smart-route";

export function SmartDayRoute({ items, countryId, tripName, disabled, onUpdated }: {
  items: SmartRouteItem[]; countryId: string; tripName: string; disabled: boolean; onUpdated: () => Promise<void>;
}) {
  const dates = useMemo(() => [...new Set(items.map((item) => item.itemDate).filter((date): date is string => Boolean(date)))].sort(), [items]);
  const [date, setDate] = useState(dates[0] ?? "");
  const [mode, setMode] = useState<TravelMode>("driving");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { if (!dates.includes(date)) setDate(dates[0] ?? ""); }, [date, dates]);
  const dayItems = useMemo(() => items.filter((item) => item.itemDate === date), [date, items]);
  const analysis = useMemo(() => analyzeDayRoute(dayItems, mode), [dayItems, mode]);
  const routeUrl = useMemo(() => dayRouteUrl(dayItems, mode), [dayItems, mode]);
  const searchBase = analysis.ordered.find((item) => item.area)?.area ?? tripName;

  async function applyOrder() {
    if (disabled || analysis.ordered.length < 2) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/travel-items/reorder", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ countryId, itemDate: date, itemIds: analysis.ordered.map((item) => item.id) }) });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to apply the route order.");
      await onUpdated(); setMessage("Suggested day order applied.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to apply the route order."); }
    finally { setBusy(false); }
  }

  return <section className="smart-day-route" aria-labelledby="smart-route-title">
    <div className="smart-route-head"><div><p className="eyebrow">SMART DAY ROUTE</p><h3 id="smart-route-title">Schedule and movement check</h3></div><div className="smart-route-selectors"><label>Day<select value={date} onChange={(event) => setDate(event.target.value)}>{dates.map((value) => <option key={value}>{value}</option>)}</select></label><label>Mode<select value={mode} onChange={(event) => setMode(event.target.value as TravelMode)}><option value="driving">Drive</option><option value="transit">Public transport</option><option value="walking">Walk</option><option value="bicycling">Cycle</option></select></label></div></div>
    {!dates.length ? <p className="muted">Add dates to itinerary activities to build a day route.</p> : <>
      <div className="smart-route-summary"><span>{dayItems.length} stops</span><span>{analysis.missingTimes} without time</span><span>{analysis.warnings.length} warning{analysis.warnings.length === 1 ? "" : "s"}</span></div>
      {analysis.warnings.length ? <ul className="smart-route-warnings">{analysis.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : <p className="form-success">No schedule overlap detected for this day.</p>}
      <ol className="smart-route-order">{analysis.ordered.map((item) => <li key={item.id}><span>{item.itemTime ?? "Flexible"}</span><strong>{item.title}</strong><small>{item.area ?? "Area not set"}</small></li>)}</ol>
      <div className="smart-route-actions"><button className="button secondary" disabled={busy || disabled || analysis.ordered.length < 2} type="button" onClick={() => void applyOrder()}>{busy ? "Applying…" : "Apply suggested order"}</button>{routeUrl ? <a className="button secondary" href={routeUrl} target="_blank" rel="noreferrer">Open route ↗</a> : null}</div>
      <div className="discovery-shortcuts" aria-label="Nearby discovery"><span>Discover nearby:</span>{[["Top sights", "top attractions"], ["Local food", "local food"], ["Rainy day", "indoor attractions"], ["Pharmacy", "pharmacy"], ["Hospital", "hospital"]].map(([label, query]) => <a key={label} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${query} near ${searchBase}`)}`} target="_blank" rel="noreferrer">{label}</a>)}</div>
    </>}
    {message ? <p className="form-success" role="status">{message}</p> : null}
  </section>;
}
