"use client";

import { useEffect, useState } from "react";

export function TripInvitePanel({ tripId, tripName }: { tripId: string; tripName: string }) {
  const [link, setLink] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    let disposed = false;
    if (!link) {
      setQrDataUrl("");
      return;
    }

    void import("qrcode")
      .then((QRCode) => QRCode.toDataURL(link, { width: 220, margin: 1, errorCorrectionLevel: "M" }))
      .then((dataUrl) => {
        if (!disposed) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (!disposed) setQrDataUrl("");
      });

    return () => {
      disposed = true;
    };
  }, [link]);

  async function createLink() {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const response = await fetch(`/api/trips/${tripId}/invite`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = (await response.json().catch(() => ({}))) as { token?: string; expiresAt?: string; error?: string };
      if (!response.ok || !payload.token) {
        throw new Error(payload.error ?? "Unable to create invite link.");
      }
      setLink(`${window.location.origin}/invite/${payload.token}`);
      setExpiresAt(payload.expiresAt ?? "");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create invite link.");
    } finally {
      setBusy(false);
    }
  }

  async function revokeLinks() {
    if (!window.confirm("Revoke all active invite links for this trip? Anyone with an old link will no longer be able to join.")) return;
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const response = await fetch(`/api/trips/${tripId}/invite`, { method: "DELETE" });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to revoke invite links.");
      setLink("");
      setExpiresAt("");
      setQrDataUrl("");
      setStatus("All active invite links for this trip were revoked.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to revoke invite links.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setStatus("Invite link copied.");
    } catch {
      setStatus("Copy is not available. Press and hold the link to copy it.");
    }
  }

  async function share() {
    if (!link) return;
    const text = `Join my ${tripName} trip on Miles & Meals`;
    if (navigator.share) {
      try {
        await navigator.share({ title: tripName, text, url: link });
        setStatus("Invite shared.");
        return;
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
      }
    }
    await copyLink();
  }

  return (
    <section className="trip-invite-panel">
      <div>
        <p className="eyebrow">INVITE TRAVELERS</p>
        <h3>Bring the group in</h3>
        <p className="muted">Create a secure link, then share it in WhatsApp, Telegram or your group chat. The link and QR code are valid for 12 hours.</p>
      </div>
      {!link ? (
        <div className="button-row">
          <button className="button secondary" type="button" onClick={() => void createLink()} disabled={busy}>
            {busy ? "Creating…" : "Create invite link"}
          </button>
          <button className="button secondary" type="button" onClick={() => void revokeLinks()} disabled={busy}>
            Revoke old links
          </button>
        </div>
      ) : (
        <div className="trip-invite-result">
          <input value={link} readOnly aria-label="Trip invite link" />
          <p className="muted">
            Valid for 12 hours{expiresAt ? ` · expires ${new Date(expiresAt).toLocaleString()}` : ""}.
          </p>
          <div className="button-row">
            <button className="button primary" type="button" onClick={() => void share()}>Share invite</button>
            <button className="button secondary" type="button" onClick={() => void copyLink()}>Copy</button>
            <button className="button secondary" type="button" onClick={() => void revokeLinks()} disabled={busy}>Revoke links</button>
          </div>
          <div className="invite-qr" aria-label="QR code for trip invite">
            {qrDataUrl ? <img alt="Trip invite QR code" src={qrDataUrl} /> : <span className="mini-spinner" aria-label="Creating QR code" />}
            <small>Generated privately on this device. Scan to open this trip invite.</small>
          </div>
        </div>
      )}
      {status ? <p className="success-text" role="status">{status}</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </section>
  );
}
