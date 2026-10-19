"use client";
import { upload } from "@vercel/blob/client";
import { useEffect, useRef, useState } from "react";
import { MEDIA_CONSENT_TEXT, MEDIA_CONSENT_VERSION, MEDIA_TYPES, MAX_MEDIA_BYTES, isMediaType } from "@/lib/shared-media";
import { galleryFileSize } from "@/lib/personal-gallery";
import design from "./SharedGallery.module.css";
type SharedFile = { id: string; name: string; contentType: string; byteSize: number; ownerId: string; ownerName: string; createdAt: string; status: string };
async function readJson(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "The request could not finish. Try again.");
  return body;
}
function MediaDialog({ file, close }: { file: SharedFile; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.showModal();
    return () => { dialog.current?.close(); if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);
  return <dialog ref={dialog} className={design.dialog} aria-labelledby="shared-file-title" onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <header><div><p className="eyebrow">SHARED BY {file.ownerName}</p><h2 id="shared-file-title">{file.name}</h2></div><button className="button secondary" autoFocus type="button" onClick={close} aria-label="Close media">✕</button></header>
    {failed ? <p role="status">This file is unavailable or its format cannot play in this browser. Refresh the gallery to check whether sharing was removed.</p> : file.contentType.startsWith("video/") ? <video src={`/api/shared-media/${file.id}`} controls playsInline preload="metadata" onError={() => setFailed(true)} /> : <img src={`/api/shared-media/${file.id}`} alt={file.name} onError={() => setFailed(true)} />}
  </dialog>;
}
export function SharedGallery({ admin }: { admin: boolean }) {
  const [scope, setScope] = useState(admin ? "all" : "mine");
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [offset, setOffset] = useState(0);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [selection, setSelection] = useState<File[]>([]);
  const [consent, setConsent] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState("");
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState("");
  const [opened, setOpened] = useState<SharedFile | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const uploadAbort = useRef<AbortController | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setFiles([]); setOpened(null);
    void fetch(`/api/shared-media?scope=${scope}&offset=${offset}`, { cache: "no-store", signal: controller.signal }).then(readJson).then(body => {
      if (controller.signal.aborted) return;
      setFiles(body.files || []); setConfigured(body.configured); setNextOffset(body.nextOffset ?? null);
    }).catch(error => { if (!controller.signal.aborted) setMessage(error.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [scope, offset, refreshVersion]);
  useEffect(() => () => uploadAbort.current?.abort(), []);
  function choose(chosen: FileList | null) {
    if (!chosen?.length) return;
    const supported = Array.from(chosen).filter(file => isMediaType(file.type) && file.size > 0 && file.size <= MAX_MEDIA_BYTES);
    setSelection(supported.slice(0,10)); setConsent(false);
    setMessage(chosen.length !== Math.min(10, supported.length) ? "Some files were skipped. Choose up to 10 JPEG, PNG, WebP, MP4, MOV or WebM files, each up to 25 MB. Export HEIC photos as JPEG first." : "Files selected. Review the sharing notice before uploading.");
  }
  async function share() {
    if (busy || !consent || !selection.length || !navigator.onLine) { if (!navigator.onLine) setMessage("Connect to the internet to share files."); return; }
    const controller = new AbortController(); uploadAbort.current = controller;
    setBusy(true); setMessage("");
    let completed = 0;
    const remaining = [...selection];
    for (const file of selection) {
      let id = "";
      try {
        setProgress(`Preparing ${completed + 1} of ${selection.length}…`);
        const reservation = await readJson(await fetch("/api/shared-media", { method: "POST", signal: controller.signal, headers: { "content-type": "application/json" }, body: JSON.stringify({ name: file.name, contentType: file.type, byteSize: file.size, consent: true, consentVersion: MEDIA_CONSENT_VERSION }) }));
        id = reservation.id;
        await upload(reservation.pathname, file, { access: "private", contentType: file.type, handleUploadUrl: "/api/shared-media/upload", clientPayload: id, abortSignal: controller.signal, onUploadProgress: event => setProgress(`Uploading ${completed + 1} of ${selection.length} · ${Math.round(event.percentage)}%`) });
        await readJson(await fetch("/api/shared-media/complete", { method: "POST", signal: controller.signal, headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) }));
        completed++; remaining.shift();
      } catch (error) {
        let removalUnconfirmed = false;
        if (id) {
          try { await readJson(await fetch(`/api/shared-media/${id}`, { method: "DELETE" })); }
          catch { removalUnconfirmed = true; }
        }
        setMessage(`${completed} file(s) shared. ${controller.signal.aborted ? "Upload stopped. Earlier completed files remain shared." : error instanceof Error ? error.message : "Upload could not finish."}${removalUnconfirmed ? " Removal of the interrupted file could not be confirmed. It may still finish uploading; check My shared files after reconnecting and remove it there." : ""}`);
        break;
      }
    }
    setSelection(remaining); setConsent(false); setBusy(false); setProgress(""); uploadAbort.current = null;
    if (completed === selection.length) setMessage(`${completed} file(s) shared with system admins. You can remove them below.`);
    setOffset(0); setRefreshVersion(value => value + 1);
  }
  async function remove(file: SharedFile) {
    if (removing || !confirm(`Remove sharing for “${file.name}”? Future viewing in this app will stop. Copies already saved cannot be recalled.`)) return;
    setRemoving(file.id); setMessage("");
    try {
      const body = await readJson(await fetch(`/api/shared-media/${file.id}`, { method: "DELETE" }));
      if (opened?.id === file.id) setOpened(null);
      setFiles(current => current.filter(row => row.id !== file.id));
      setMessage(body.cleanupPending ? "Sharing stopped. Storage cleanup is pending; the file is no longer viewable in the app." : "Sharing removed. The original on the owner's phone was not deleted.");
      setRefreshVersion(value => value + 1);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not remove sharing."); }
    finally { setRemoving(""); }
  }
  return <div className={`stack gap-lg ${design.page}`}>
    <section className={design.hero}><span className={design.heroIcon} aria-hidden="true">▧</span><div><p className="eyebrow">CHOOSE · SHARE · CONTROL</p><h1>Shared gallery</h1><p>Share selected photos and videos with your app admins. Keep the rest of your phone gallery private.</p></div></section>
    <section className={`panel ${design.upload}`} aria-label="Share media with admins">
      <div className={design.heading}><div><h2>Share your moments</h2><p>Only the files you choose will be uploaded.</p></div><span className={design.tag}>Owner controlled</span></div>
      {configured === false && <p className={design.notice}>Sharing is not enabled yet. Ask your admin to complete the private storage and database setup.</p>}
      <button className="button primary" type="button" disabled={busy || configured !== true} onClick={() => picker.current?.click()}>＋ Choose photos & videos</button>
      <input ref={picker} hidden type="file" multiple accept={Object.keys(MEDIA_TYPES).join(",")} onChange={event => { choose(event.currentTarget.files); event.currentTarget.value = ""; }} aria-label="Choose files to share with admins" />
      <p className={design.small}>Up to 10 files at a time · 25 MB each · JPEG, PNG, WebP, MP4, MOV & WebM. Video playback depends on your browser.</p>
      {selection.length > 0 && <div className={design.review}>
        <h3>{selection.length} file(s) ready for review</h3><ul>{selection.map((file,index) => <li key={`${file.name}:${index}`}><span>{file.name}</span><small>{galleryFileSize(file.size)}</small><button type="button" disabled={busy} aria-label={`Remove ${file.name} from selection`} onClick={() => { setSelection(current => current.filter((_,i) => i !== index)); setConsent(false); }}>✕</button></li>)}</ul>
        <label className={design.consent}><input type="checkbox" checked={consent} disabled={busy} onChange={event => setConsent(event.target.checked)} /><span>{MEDIA_CONSENT_TEXT}</span></label>
        <div className={design.actions}><button className="button primary" type="button" disabled={!consent || busy} onClick={() => void share()}>{busy ? "Sharing…" : `Upload & share ${selection.length} file(s)`}</button>{busy ? <button className="button secondary" type="button" onClick={() => uploadAbort.current?.abort()}>Stop upload</button> : <button className="button secondary" type="button" onClick={() => { setSelection([]); setConsent(false); }}>Clear selection</button>}</div>
      </div>}
      {progress && <p role="status">{progress}</p>}
    </section>
    {message && <p className={design.notice} role="status">{message}</p>}
    <section className={design.library}>
      <div className={design.heading}><div><p className="eyebrow">SHARED FILES</p><h2>{scope === "all" ? "Shared with admins" : "My shared files"}</h2></div><button type="button" className="button secondary" disabled={busy || loading} onClick={() => { setMessage(""); setRefreshVersion(value => value + 1); }}>Refresh</button></div>
      {admin && <div className={design.tabs} role="group" aria-label="Gallery audience">{[["all", "Shared with admins"], ["mine", "My uploads"]].map(([value,label]) => <button key={value} type="button" disabled={busy} aria-pressed={scope === value} onClick={() => { setScope(value); setOffset(0); }}>{label}</button>)}</div>}
      <p className={design.small}>{admin ? "These files were explicitly shared by their owners. Other travelers cannot see them." : "Only you and system admins can view your uploaded files. You can remove sharing at any time."}</p>
      {loading ? <p role="status">Loading shared files…</p> : !files.length ? <div className={design.empty}><h3>No shared files here yet</h3><p>Choose files above, review the notice, then tap Upload & share.</p></div> : <div className={design.grid}>{files.map(file => <article key={file.id} className={design.card}>
        <button className={design.open} type="button" disabled={file.status !== "READY"} onClick={() => setOpened(file)} aria-label={`View ${file.name}`}>
          <span className={design.thumb}>{file.status !== "READY" ? <span>Upload pending</span> : file.contentType.startsWith("image/") ? <img src={`/api/shared-media/${file.id}`} alt="" loading="lazy" /> : <span className={design.play} aria-hidden="true">▶</span>}<small>{file.contentType.startsWith("image/") ? "Photo" : "Video"}</small></span>
          <strong title={file.name}>{file.name}</strong><span>{file.ownerName} · {galleryFileSize(file.byteSize)}</span><span>{new Date(file.createdAt).toLocaleDateString()}</span>
        </button><button className={`button secondary ${design.remove}`} type="button" disabled={!!removing || busy} onClick={() => void remove(file)}>{removing === file.id ? "Removing…" : "Remove sharing"}</button>
      </article>)}</div>}
      {(offset > 0 || nextOffset !== null) && <nav className={design.actions} aria-label="Gallery pages"><button type="button" className="button secondary" disabled={loading || offset === 0} onClick={() => setOffset(Math.max(0, offset - 24))}>← Previous</button><span>Page {Math.floor(offset / 24) + 1}</span><button type="button" className="button secondary" disabled={loading || nextOffset === null} onClick={() => setOffset(nextOffset!)}>Next →</button></nav>}
    </section>
    {opened && <MediaDialog key={opened.id} file={opened} close={() => setOpened(null)} />}
  </div>;
}
