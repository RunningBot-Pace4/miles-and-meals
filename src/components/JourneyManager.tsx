"use client";

import { FormEvent, useState } from "react";
import { DateRangePicker } from "@/components/DateRangePicker";
import type { JourneySummary } from "@/lib/journeys";

type TripOption = { id: string; name: string; destination: string; journeyId: string | null };

export function JourneyManager({
  journeys,
  trips,
  currentUserId,
}: {
  journeys: JourneySummary[];
  trips: TripOption[];
  currentUserId: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/journeys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          startDate: data.get("startDate"),
          endDate: data.get("endDate"),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to create Journey.");
      window.location.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create Journey.");
      setBusy(false);
    }
  }

  async function save(journey: JourneySummary, form: HTMLFormElement) {
    const data = new FormData(form);
    const tripIds = data.getAll("tripIds").map(String);
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/journeys/${journey.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          startDate: data.get("startDate"),
          endDate: data.get("endDate"),
          tripIds,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to save Journey.");
      window.location.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save Journey.");
      setBusy(false);
    }
  }

  async function remove(journey: JourneySummary) {
    if (!window.confirm(`Delete Journey “${journey.name}”? The Trips stay intact and simply become ungrouped.`)) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/journeys/${journey.id}`, { method: "DELETE" });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to delete Journey.");
      window.location.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete Journey.");
      setBusy(false);
    }
  }

  return (
    <div className="stack gap-lg">
      <section className="panel journey-create-panel">
        <p className="eyebrow">OPTIONAL · MULTI-COUNTRY HOLIDAY</p>
        <h2>Put related Trips under one Journey</h2>
        <p className="muted">
          Example: “Asia 2027” can contain your separate Vietnam Trip and Japan Trip.
          It only organizes them together—their currencies, expenses and settlements stay separate.
        </p>
        <form className="stack" onSubmit={create}>
          <label>Journey name<input name="name" required minLength={2} maxLength={120} placeholder="Asia 2027" /></label>
          <DateRangePicker startName="startDate" endName="endDate" label="Whole Journey dates" />
          <button className="button primary" disabled={busy} type="submit">Create Journey</button>
        </form>
      </section>

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      {journeys.map((journey) => {
        const canEdit = journey.createdBy === currentUserId;

        if (!canEdit) {
          return (
            <article className="panel journey-card journey-card-readonly" key={journey.id}>
              <div className="journey-card-head">
                <div><p className="eyebrow">SHARED JOURNEY</p><h2>{journey.name}</h2></div>
                <span>{journey.trips.length} trip{journey.trips.length === 1 ? "" : "s"}</span>
              </div>
              <p className="muted">You can view the Trips you currently belong to. Only the Journey creator can change this grouping.</p>
              <div className="journey-readonly-trips">
                {journey.trips.length ? journey.trips.map((trip) => (
                  <div className="journey-trip-row" key={trip.id}>
                    <span><strong>{trip.name}</strong><small>{trip.destination}</small></span>
                  </div>
                )) : <p className="muted">No linked Trips are currently visible to you.</p>}
              </div>
            </article>
          );
        }

        return (
          <form className="panel journey-card" key={journey.id} onSubmit={(event) => { event.preventDefault(); void save(journey, event.currentTarget); }}>
            <div className="journey-card-head"><div><p className="eyebrow">JOURNEY</p><h2>{journey.name}</h2></div><span>{journey.trips.length} trip{journey.trips.length === 1 ? "" : "s"}</span></div>
            <label>Journey name<input name="name" defaultValue={journey.name} required minLength={2} maxLength={120} /></label>
            <DateRangePicker
              defaultStartDate={journey.startDate ?? ""}
              defaultEndDate={journey.endDate ?? ""}
              startName="startDate"
              endName="endDate"
              label="Whole Journey dates"
            />
            <fieldset className="journey-trip-picker">
              <legend>Trips in this Journey</legend>
              {trips.length ? trips.map((trip) => (
                <label key={trip.id} className="journey-trip-row">
                  <input type="checkbox" name="tripIds" value={trip.id} defaultChecked={trip.journeyId === journey.id} />
                  <span><strong>{trip.name}</strong><small>{trip.destination}</small></span>
                </label>
              )) : <p className="muted">Create or own a Trip before adding it to a Journey.</p>}
            </fieldset>
            <div className="button-row">
              <button className="button primary" disabled={busy} type="submit">Save Journey</button>
              <button className="button secondary" disabled={busy} type="button" onClick={() => void remove(journey)}>Delete Journey</button>
            </div>
          </form>
        );
      })}
    </div>
  );
}
