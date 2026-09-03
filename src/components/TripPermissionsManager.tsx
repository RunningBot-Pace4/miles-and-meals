"use client";

import { useEffect, useMemo, useState } from "react";

type TripOption = { id: string; name: string; financialStatus: string };
type Member = {
  userId: string;
  name: string;
  role: string;
  canEditPlan: boolean;
  canAddExpenses: boolean;
  canViewDocuments: boolean;
  canAddMemories: boolean;
};

const controls = [
  ["canEditPlan", "Edit Plan"],
  ["canAddExpenses", "Add expenses"],
  ["canViewDocuments", "View shared documents"],
  ["canAddMemories", "Add memories"],
] as const;

export function TripPermissionsManager({ trips, initialTripId }: { trips: TripOption[]; initialTripId: string }) {
  const [tripId, setTripId] = useState(initialTripId || trips[0]?.id || "");
  const [members, setMembers] = useState<Member[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const trip = useMemo(() => trips.find((item) => item.id === tripId), [tripId, trips]);

  useEffect(() => {
    if (!tripId) return;
    const controller = new AbortController();
    fetch(`/api/trip-permissions?tripId=${encodeURIComponent(tripId)}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json() as { members?: Member[]; canManage?: boolean; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Unable to load permissions.");
        setMembers(payload.members ?? []);
        setCanManage(Boolean(payload.canManage));
        setMessage("");
      })
      .catch((error) => { if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "Unable to load permissions."); });
    return () => controller.abort();
  }, [tripId]);

  async function change(member: Member, field: typeof controls[number][0], checked: boolean) {
    const next = { ...member, [field]: checked };
    setMembers((current) => current.map((item) => item.userId === member.userId ? next : item));
    setBusy(member.userId);
    setMessage("");
    try {
      const response = await fetch("/api/trip-permissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tripId, userId: member.userId, ...Object.fromEntries(controls.map(([key]) => [key, next[key]])) }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to save permissions.");
      setMessage(`${member.name}'s permissions were updated.`);
    } catch (error) {
      setMembers((current) => current.map((item) => item.userId === member.userId ? member : item));
      setMessage(error instanceof Error ? error.message : "Unable to save permissions.");
    } finally {
      setBusy("");
    }
  }

  return <div className="stack gap-lg permissions-workspace">
    <section className="panel">
      <p className="eyebrow">COLLABORATION CONTROL</p>
      <h1>Traveler permissions</h1>
      <p className="muted">Owners always retain full access. Restrictions are enforced by the server, including offline changes when they reconnect.</p>
      <label>Trip<select value={tripId} onChange={(event) => setTripId(event.target.value)}>{trips.map((item) => <option key={item.id} value={item.id}>{item.name}{item.financialStatus === "CLOSED" ? " · Closed" : ""}</option>)}</select></label>
    </section>
    <section className="permissions-list">
      {members.map((member) => <article className="panel permission-member-card" key={member.userId}>
        <div className="permission-member-heading"><strong>{member.name}</strong><small>{member.role === "OWNER" ? "Trip Owner" : "Traveler"}</small></div>
        {member.role === "OWNER" ? (
          <div className="permission-owner-summary">
            <span aria-hidden="true">✓</span>
            <div><strong>Full Trip access</strong><small>Owner permissions are always enabled.</small></div>
          </div>
        ) : (
          <div className="permission-toggle-grid">
            {controls.map(([field, label]) => {
              const selected = member[field];
              return (
                <label className={selected ? "permission-option selected" : "permission-option"} key={field}>
                  <input
                    className="permission-native-control"
                    type="checkbox"
                    checked={selected}
                    disabled={!canManage || trip?.financialStatus === "CLOSED" || busy === member.userId}
                    onChange={(event) => void change(member, field, event.target.checked)}
                  />
                  <span className="permission-check" aria-hidden="true">{selected ? "✓" : ""}</span>
                  <span className="permission-label">{label}</span>
                </label>
              );
            })}
          </div>
        )}
      </article>)}
      {!members.length ? <article className="empty-card"><h2>No travelers</h2><p>Add travelers to this Trip first.</p></article> : null}
    </section>
    {!canManage && members.length ? <p className="permission-access-note" role="status">View only · Only the Trip Owner can change traveler permissions.</p> : null}
    {trip?.financialStatus === "CLOSED" ? <p className="permission-access-note" role="status">This Trip is closed, so permissions are locked.</p> : null}
    {message ? <p className="form-success" role="status">{message}</p> : null}
  </div>;
}
