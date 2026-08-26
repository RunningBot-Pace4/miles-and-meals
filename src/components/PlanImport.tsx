"use client";

import { ChangeEvent, useState } from "react";
import { parsePlanConfirmation, type PlanImportDraft } from "@/lib/plan-import";

const emptyDraft: PlanImportDraft = {
  title: "",
  itemDate: "",
  itemTime: "",
  area: "",
  provider: "",
  confirmationNo: "",
  notes: "Imported from a confirmation after manual review. Original message was not stored.",
  confidence: "LOW",
};

export function PlanImport({
  countryId,
  disabled,
  onImported,
}: {
  countryId: string;
  disabled?: boolean;
  onImported: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState("");
  const [draft, setDraft] = useState<PlanImportDraft>(emptyDraft);
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function analyze() {
    if (!source.trim()) {
      setError("Paste a confirmation or upload a TXT/EML file first.");
      return;
    }
    setDraft(parsePlanConfirmation(source));
    setReviewing(true);
    setError("");
  }

  async function loadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/\.(txt|eml)$/i.test(file.name) || file.size > 1_000_000) {
      setError("Use a TXT or EML file up to 1 MB. Paste PDF details as text for review.");
      return;
    }
    setSource(await file.text());
    setError("");
  }

  async function save() {
    if (!draft.title.trim() || !countryId || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/travel-items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          countryId,
          itemType: "ITINERARY",
          title: draft.title,
          itemDate: draft.itemDate,
          itemTime: draft.itemTime,
          area: draft.area,
          subtype: "Reservation",
          priority: "High",
          status: "Booked",
          estimatedCost: "",
          quantity: "",
          provider: draft.provider,
          confirmationNo: draft.confirmationNo,
          linkUrl: "",
          notes: draft.notes,
          sortOrder: 0,
          durationMinutes: 60,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to add this reviewed plan.");
      setSource("");
      setDraft(emptyDraft);
      setReviewing(false);
      setOpen(false);
      await onImported();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to import this plan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="plan-import">
      <button className="button secondary" type="button" disabled={disabled} onClick={() => setOpen((value) => !value)}>
        {open ? "Close import" : "Import confirmation"}
      </button>
      {open ? (
        <section className="plan-import-panel">
          <div>
            <p className="eyebrow">REVIEW BEFORE SAVE</p>
            <h3>Import into Plan</h3>
            <p>Paste confirmation text or upload TXT/EML. Nothing is added until you confirm, and the original message is not stored.</p>
          </div>

          {!reviewing ? (
            <>
              <label>
                Confirmation text
                <textarea rows={8} value={source} onChange={(event) => setSource(event.target.value)} placeholder="Paste airline, hotel or tour confirmation here…" />
              </label>
              <label className="plan-import-file">
                Or upload TXT / EML
                <input type="file" accept=".txt,.eml,text/plain,message/rfc822" onChange={(event) => void loadFile(event)} />
              </label>
              <button className="button primary" type="button" onClick={analyze}>Review extracted details</button>
            </>
          ) : (
            <div className="plan-import-review">
              <p className={`plan-import-confidence ${draft.confidence.toLowerCase()}`}>
                {draft.confidence} extraction confidence · check every field
              </p>
              <label>Title<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
              <div className="form-grid">
                <label>Date<input type="date" value={draft.itemDate} onChange={(event) => setDraft({ ...draft, itemDate: event.target.value })} /></label>
                <label>Time<input type="time" value={draft.itemTime} onChange={(event) => setDraft({ ...draft, itemTime: event.target.value })} /></label>
                <label>Provider<input value={draft.provider} onChange={(event) => setDraft({ ...draft, provider: event.target.value })} /></label>
                <label>Confirmation number<input value={draft.confirmationNo} onChange={(event) => setDraft({ ...draft, confirmationNo: event.target.value })} /></label>
                <label className="span-2">Location<input value={draft.area} onChange={(event) => setDraft({ ...draft, area: event.target.value })} /></label>
              </div>
              <div className="planner-form-actions">
                <button className="button secondary" type="button" onClick={() => setReviewing(false)}>Back</button>
                <button className="button primary" type="button" disabled={busy || !draft.title.trim()} onClick={() => void save()}>
                  {busy ? "Adding…" : "Confirm & add to Plan"}
                </button>
              </div>
            </div>
          )}
          {error ? <p className="form-error" role="alert">{error}</p> : null}
        </section>
      ) : null}
    </div>
  );
}
