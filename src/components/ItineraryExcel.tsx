"use client";
import { useEffect, useRef, useState } from "react";
import { MAX_ITINERARY_BYTES, type ItineraryPreviewRow } from "@/lib/itinerary-import";
import type { PlannerItem } from "@/lib/planner-types";
import styles from "./ItineraryExcel.module.css";
type Preview = { sheets: string[]; sheet: string; rows: ItineraryPreviewRow[] };
export function ItineraryExcel({ countryId, tripName, disabled, onImported }: {
  countryId: string; tripName: string; disabled?: boolean; onImported: (items: PlannerItem[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function download(template: boolean) {
    setBusy(true); setError("");
    const abort = new AbortController(); controller.current = abort;
    try {
      const response = await fetch(`/api/travel-items/itinerary-excel?countryId=${encodeURIComponent(countryId)}${template ? "&template=1" : ""}`, { signal: abort.signal, cache: "no-store" });
      if (!response.ok) throw new Error((await response.json()).error ?? "Could not download Excel.");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a"); link.href = url;
      link.download = `miles-meals-${template ? "itinerary-template" : "itinerary"}.xlsx`;
      document.body.append(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (caught) { if (!abort.signal.aborted) setError(caught instanceof Error ? caught.message : "Download failed."); }
    finally { if (!abort.signal.aborted) setBusy(false); }
  }
  async function read(next: File, sheet = "") {
    controller.current?.abort();
    const abort = new AbortController(); controller.current = abort;
    setFile(next); setBusy(true); setError(""); setNotice(""); setPreview(null); setSelected([]);
    try {
      if (!/\.xlsx$/i.test(next.name) || next.size > MAX_ITINERARY_BYTES) throw new Error("Choose an XLSX file up to 2 MB.");
      const body = new FormData(); body.set("file", next); body.set("countryId", countryId); body.set("sheet", sheet);
      const response = await fetch("/api/travel-items/itinerary-excel", { method: "POST", body, signal: abort.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not read Excel.");
      if (abort.signal.aborted) return;
      setPreview(data);
      setSelected(data.rows.filter((row: ItineraryPreviewRow) => !row.duplicate && !row.errors.length).map((row: ItineraryPreviewRow) => row.rowNumber));
    } catch (caught) { if (!abort.signal.aborted) setError(caught instanceof Error ? caught.message : "Could not read Excel."); }
    finally { if (!abort.signal.aborted) setBusy(false); }
  }
  async function save() {
    if (!preview || busy || disabled || !selected.length) return;
    setBusy(true); setError("");
    const abort = new AbortController(); controller.current = abort;
    try {
      const response = await fetch("/api/travel-items/import-itinerary", { method: "POST", headers: { "content-type": "application/json" }, signal: abort.signal,
        body: JSON.stringify({ countryId, rows: preview.rows.filter(row => selected.includes(row.rowNumber) && !row.duplicate && !row.errors.length) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not import itinerary.");
      if (abort.signal.aborted) return;
      onImported(data.items); setPreview(null); setSelected([]); setFile(null); setOpen(false);
      setNotice(`${data.imported} activities added to ${tripName}.${data.skipped ? ` ${data.skipped} matching activities skipped.` : ""}`);
    } catch (caught) { if (!abort.signal.aborted) setError(caught instanceof Error ? caught.message : "Could not import itinerary."); }
    finally { if (!abort.signal.aborted) setBusy(false); }
  }
  return <section className={styles.card} aria-label="Itinerary Excel" aria-busy={busy}>
    <div className={styles.heading}><div><p>PLAN WITH EXCEL</p><h3>Your itinerary, ready to fill in</h3><span>{tripName}</span></div>
      <div className={styles.actions}>
        <button type="button" className="button secondary" disabled={busy || !countryId} onClick={() => void download(true)}>Download Excel template</button>
        <button type="button" className="button secondary" disabled={busy || !countryId} onClick={() => void download(false)}>Export itinerary</button>
        <button type="button" className="button primary" disabled={disabled || busy || !countryId} aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? "Close import" : "Import Excel"}</button>
      </div>
    </div>
    {busy ? <p role="status">Working… Please keep this page open.</p> : null}
    {notice ? <p className={styles.success} role="status">{notice}</p> : null}
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    {open ? <div className={styles.importPanel}>
      <p>Import into <strong>{tripName}</strong>. One activity per row. Flexible times stay as written. Category labels stay in the itinerary; this does not create extra Places, Meals or Shop records.</p>
      <label className={styles.file}>Choose Excel file<input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={busy || disabled} onChange={event => { const next = event.target.files?.[0]; event.target.value = ""; if (next) void read(next); }} /><small>Up to 200 activities and 2 MB. Your earlier Hong Kong template is supported.</small></label>
      {preview ? <>
        <label>Worksheet<select value={preview.sheet} disabled={busy || disabled} onChange={event => { if (file) void read(file, event.target.value); }}>{preview.sheets.map(sheet => <option key={sheet}>{sheet}</option>)}</select></label>
        <div className={styles.reviewHeader}><strong>{selected.length} of {preview.rows.length} activities selected</strong><button type="button" className="button secondary" disabled={busy || disabled} onClick={() => setSelected(selected.length ? [] : preview.rows.filter(row => !row.duplicate && !row.errors.length).map(row => row.rowNumber))}>{selected.length ? "Clear selection" : "Select valid rows"}</button></div>
        <p className={styles.help}>Review before saving. Matching date, timing, area and activity are treated as duplicates and skipped. Existing entries are not overwritten.</p>
        {!preview.rows.length ? <p role="status">This worksheet has no activities yet. Fill in the template, or select another worksheet.</p> : null}
        <div className={styles.rows}>{preview.rows.map(row => <label className={`${styles.row} ${row.errors.length ? styles.invalid : ""}`} key={row.rowNumber}>
          <input type="checkbox" checked={selected.includes(row.rowNumber)} disabled={busy || disabled || row.duplicate || !!row.errors.length} onChange={event => setSelected(ids => event.target.checked ? [...ids, row.rowNumber] : ids.filter(id => id !== row.rowNumber))} />
          <span><small>Row {row.rowNumber} · {row.itemDate || "Unscheduled"} · {row.itemTime || "Flexible"}</small><strong>{row.title || "Activity name missing"}</strong><span>{row.area}{row.subtype ? ` · ${row.subtype}` : ""}</span>{row.notes ? <small>{row.notes}</small> : null}{row.duplicate ? <b>Matching activity — will be skipped</b> : null}{row.errors.map((issue, i) => <b key={i}>{issue}</b>)}</span>
        </label>)}</div>
        <button type="button" className="button primary" disabled={busy || disabled || !selected.length} onClick={() => void save()}>{busy ? "Importing…" : `Confirm & import ${selected.length} activities`}</button>
      </> : null}
    </div> : null}
  </section>;
}
