"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { galleryFileKind, galleryFileSize, selectGalleryFiles, type GalleryKind } from "@/lib/personal-gallery";
import design from "./PersonalGallery.module.css";
const PAGE_SIZE = 24;
function useLocalFileUrl(file: File | null) {
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview({ file, url });
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return preview?.file === file ? preview.url : "";
}
function PhotoTile({ file, onOpen }: { file: File; onOpen: () => void }) {
  const photo = galleryFileKind(file) === "photo";
  const url = useLocalFileUrl(photo ? file : null);
  const [failedFile, setFailedFile] = useState<File | null>(null);
  const failed = failedFile === file;
  return <button className={design.tile} type="button" onClick={onOpen} aria-label={`View ${file.name}`}>
    <span className={design.thumbnail}>
      {photo && url && !failed ? <img src={url} alt="" loading="lazy" onError={() => setFailedFile(file)} /> : <span className={design.placeholder} aria-hidden="true">{photo ? "▧" : "▶"}</span>}
      <span className={design.kind}>{photo ? "Photo" : "Video"}</span>
    </span>
    <span className={design.fileName} title={file.name}>{file.name}</span>
    <span className={design.fileMeta}>{galleryFileSize(file.size)}{failed ? " · Open for details" : ""}</span>
  </button>;
}
function MediaViewer({ file, position, count, onClose, onPrevious, onNext }: {
  file: File; position: number; count: number; onClose: () => void; onPrevious: () => void; onNext: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const url = useLocalFileUrl(file);
  const [failedFile, setFailedFile] = useState<File | null>(null);
  const failed = failedFile === file;
  useEffect(() => {
    const element = dialog.current;
    const returnFocus = document.activeElement;
    element?.showModal();
    return () => { element?.close(); if (returnFocus instanceof HTMLElement && returnFocus.isConnected) returnFocus.focus(); };
  }, []);
  return <dialog ref={dialog} className={design.viewer} aria-labelledby="personal-gallery-file-title" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={design.viewerContent}>
      <header className={design.viewerHeader}><div><small>{position + 1} of {count} · On your device</small><h2 id="personal-gallery-file-title">{file.name}</h2></div><button type="button" className="button secondary" onClick={onClose} autoFocus aria-label="Close photo or video">✕</button></header>
      <div className={design.media}>
        {failed ? <p role="status">This browser cannot preview this file format. The original file is still on your device.</p> : url ? galleryFileKind(file) === "video" ? <video key={url} src={url} controls playsInline preload="metadata" onError={() => setFailedFile(file)} aria-label={file.name} /> : <img key={url} src={url} alt={file.name} onError={() => setFailedFile(file)} /> : <p>Opening file…</p>}
      </div>
      <footer className={design.viewerFooter}><button className="button secondary" type="button" disabled={position === 0} onClick={onPrevious}>← Previous</button><span>{galleryFileSize(file.size)}</span><button className="button secondary" type="button" disabled={position + 1 === count} onClick={onNext}>Next →</button></footer>
    </div>
  </dialog>;
}
export function PersonalGallery() {
  const picker = useRef<HTMLInputElement>(null);
  const folderPicker = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [kind, setKind] = useState<"all" | GalleryKind>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "name">("newest");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [folderSupported, setFolderSupported] = useState(false);
  useEffect(() => { setFolderSupported("webkitdirectory" in document.createElement("input")); }, []);
  const filtered = useMemo(() => selectGalleryFiles(files, kind, search, sort), [files, kind, search, sort]);
  const photos = useMemo(() => files.filter(file => galleryFileKind(file) === "photo").length, [files]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const visible = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const position = selected ? filtered.indexOf(selected) : -1;
  function choose(selection: FileList | null) {
    if (!selection?.length) return;
    const chosen = Array.from(selection);
    const media = chosen.filter(file => galleryFileKind(file));
    setSelected(null); setFiles(media); setPage(0); setSearch(""); setKind("all");
    setMessage(`${media.length} photo/video files selected.${chosen.length > media.length ? ` ${chosen.length - media.length} other files were skipped.` : ""} Nothing was uploaded.`);
  }
  return <div className={`stack gap-lg ${design.page}`}>
    <section className={design.hero}><div><p className="eyebrow">ON YOUR DEVICE</p><h1>My photo & video viewer</h1><p>Browse the photos and videos you choose. Your files stay on this device and are not shared with admins or other travelers.</p></div><div className={design.summary}><span><strong>{files.length}</strong> selected</span><span><strong>{photos}</strong> photos</span><span><strong>{files.length - photos}</strong> videos</span></div></section>
    <section className={`panel ${design.selection}`} aria-label="Choose your photos and videos">
      <div className={design.actions}><button type="button" className="button primary" onClick={() => picker.current?.click()}>Choose photos & videos</button>{folderSupported && <button type="button" className="button secondary" onClick={() => folderPicker.current?.click()}>Choose a folder</button>}{files.length > 0 && <button className="button secondary" type="button" onClick={() => { setSelected(null); setFiles([]); setPage(0); setMessage("Selection cleared. Original files were not deleted."); }}>Clear selection</button>}</div>
      <input ref={picker} hidden type="file" multiple accept="image/*,video/*" aria-label="Select photos and videos from your device" onChange={event => { choose(event.currentTarget.files); event.currentTarget.value = ""; }} />
      <input ref={folderPicker} hidden type="file" multiple {...{ webkitdirectory: "" }} aria-label="Select a media folder from your device" onChange={event => { choose(event.currentTarget.files); event.currentTarget.value = ""; }} />
      <p>The phone or browser picker controls what you share with this viewer. It cannot automatically scan your entire phone gallery. A folder selection lists media inside that chosen folder; availability depends on your browser. Choosing again replaces this selection.</p>
      <p className={design.notice}>Files are available for this page session only. Reopening the page requires selecting them again.</p>
      {message && <p role="status">{message}</p>}
    </section>
    {files.length > 0 && <>
      <section className={design.toolbar} aria-label="Filter your selected media"><div className={design.filters} role="group" aria-label="Media type">{([['all', 'All'], ['photo', 'Photos'], ['video', 'Videos']] as const).map(([value, label]) => <button className={kind === value ? design.active : ""} type="button" aria-pressed={kind === value} key={value} onClick={() => { setKind(value); setPage(0); }}>{label}</button>)}</div><label>Find a file<input type="search" value={search} placeholder="Search name or folder" onChange={event => { setSearch(event.target.value); setPage(0); }} /></label><label>Sort<select value={sort} onChange={event => { setSort(event.target.value as typeof sort); setPage(0); }}><option value="newest">File date · newest first</option><option value="oldest">File date · oldest first</option><option value="name">Name · A–Z</option></select></label></section>
      <p className={design.resultCount} role="status">{filtered.length} matching {filtered.length === 1 ? "file" : "files"} · File date is the last-modified date, not necessarily when a photo was taken.</p>
      <section className={design.grid} aria-label="Your selected photos and videos">{visible.map((file, index) => <PhotoTile key={`${currentPage}:${index}:${file.name}:${file.lastModified}`} file={file} onOpen={() => setSelected(file)} />)}</section>
      {!filtered.length && <div className="empty-card"><h2>No matching files</h2><p>Try another filter or search.</p></div>}
      {totalPages > 1 && <nav className={design.pagination} aria-label="Media pages"><button type="button" className="button secondary" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>← Previous</button><span>{currentPage + 1} / {totalPages}</span><button type="button" className="button secondary" disabled={currentPage + 1 >= totalPages} onClick={() => setPage(currentPage + 1)}>Next →</button></nav>}
    </>}
    {!files.length && <section className={design.empty}><span aria-hidden="true">▧</span><h2>Your moments, on your device</h2><p>Choose photos and videos above to start browsing. Opening the phone's picker does not upload your library.</p></section>}
    {selected && position >= 0 && <MediaViewer file={selected} count={filtered.length} position={position} onClose={() => setSelected(null)} onPrevious={() => setSelected(filtered[position - 1] ?? selected)} onNext={() => setSelected(filtered[position + 1] ?? selected)} />}
  </div>;
}
