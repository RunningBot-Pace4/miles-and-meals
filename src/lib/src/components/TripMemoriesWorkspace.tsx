"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { readPrivateTravelFile } from "@/lib/private-travel-file";

type TripOption = { id: string; name: string; financialStatus: string };
type MemoryRow = {
  id: string; title: string; story: string | null; place: string | null;
  occurredOn: string | null; photoData: string | null; createdBy: string; createdByName: string;
};

export function TripMemoriesWorkspace({ trips, initialTripId }: { trips: TripOption[]; initialTripId: string }) {
  const [tripId, setTripId] = useState(initialTripId || trips[0]?.id || "");
  const [memories, setMemories] = useState<MemoryRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [draft, setDraft] = useState({ title: "", story: "", place: "", occurredOn: "", photoData: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const trip = useMemo(() => trips.find((item) => item.id === tripId), [tripId, trips]);
  const locked = trip?.financialStatus === "CLOSED";

  async function refresh(targetTripId = tripId) {
    if (!targetTripId) return;
    const response = await fetch(`/api/trip-memories?tripId=${encodeURIComponent(targetTripId)}`, { cache: "no-store" });
    const payload = await response.json().catch(() => ({})) as { memories?: MemoryRow[]; currentUserId?: string; error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Unable to load memories.");
    setMemories(payload.memories ?? []); setCurrentUserId(payload.currentUserId ?? "");
  }

  useEffect(() => { void refresh().catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load memories.")); }, [tripId]);

  async function loadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const photoData = await readPrivateTravelFile(file, true);
      setDraft((current) => ({ ...current, photoData }));
      setMessage(`${file.name} is ready.`);
    }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to use this image."); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy || locked) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/trip-memories", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tripId, ...draft }) });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to save memory.");
      setDraft({ title: "", story: "", place: "", occurredOn: "", photoData: "" }); await refresh(); setMessage("Trip memory saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save memory."); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!confirm("Remove this Trip memory?") || locked) return;
    const response = await fetch("/api/trip-memories", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, tripId }) });
    const payload = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) { setMessage(payload.error ?? "Unable to remove memory."); return; }
    await refresh();
  }

  async function share(memory: MemoryRow) {
    const text = `${memory.title}${memory.place ? ` · ${memory.place}` : ""}${memory.story ? `\n${memory.story}` : ""}`;
    if (navigator.share) await navigator.share({ title: `${trip?.name ?? "Trip"} memory`, text });
    else { await navigator.clipboard.writeText(text); setMessage("Memory copied for sharing."); }
  }

  return <div className="stack gap-lg memories-workspace">
    <section className="panel"><p className="eyebrow">RELIVE THE MILES</p><h1>Trip memories</h1><p className="muted">Keep the stories and photos your group wants to remember. Closed Trips remain view-only.</p><label>Trip<select value={tripId} onChange={(event) => setTripId(event.target.value)}>{trips.map((item) => <option key={item.id} value={item.id}>{item.name}{item.financialStatus === "CLOSED" ? " · Closed" : ""}</option>)}</select></label></section>
    {!locked ? <section className="panel"><h2>Add a memory</h2><form className="memory-form" onSubmit={submit}><label>Title<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Best meal of the Trip…" /></label><label>Date<input type="date" value={draft.occurredOn} onChange={(event) => setDraft({ ...draft, occurredOn: event.target.value })} /></label><label className="span-2">Place<input value={draft.place} onChange={(event) => setDraft({ ...draft, place: event.target.value })} /></label><label className="span-2">Story<textarea rows={5} value={draft.story} onChange={(event) => setDraft({ ...draft, story: event.target.value })} /></label><label className="span-2">Photo under 850 KB<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void loadPhoto(event)} /></label><button className="button primary span-2" type="submit" disabled={busy || !draft.title.trim()}>{busy ? "Saving…" : "Save memory"}</button></form></section> : null}
    <section className="memory-grid">{memories.map((memory) => <article className="memory-card" key={memory.id}>{memory.photoData ? <img src={memory.photoData} alt="" /> : <div className="memory-placeholder" aria-hidden="true">✦</div>}<div><p className="eyebrow">{memory.occurredOn ?? "Trip moment"}{memory.place ? ` · ${memory.place}` : ""}</p><h2>{memory.title}</h2>{memory.story ? <p>{memory.story}</p> : null}<small>Added by {memory.createdByName}</small><div className="memory-actions"><button type="button" onClick={() => void share(memory)}>Share</button>{!locked && memory.createdBy === currentUserId ? <button type="button" onClick={() => void remove(memory.id)}>Remove</button> : null}</div></div></article>)}{!memories.length ? <article className="empty-card"><h2>No memories yet</h2><p>Add the first shared Trip moment.</p></article> : null}</section>
    {message ? <p className="form-success" role="status">{message}</p> : null}
  </div>;
}
