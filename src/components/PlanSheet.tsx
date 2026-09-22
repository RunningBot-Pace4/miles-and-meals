"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./PlanExperience.module.css";

export function PlanSheet({ title, children, onClose, busy = false }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const heading = useId();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!mounted) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.showModal();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, [mounted]);
  if (!mounted) return null;
  return createPortal(<dialog ref={ref} className={styles.sheet} aria-labelledby={heading} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <header><div><span className={styles.handle} /><h2 id={heading}>{title}</h2></div><button type="button" disabled={busy} onClick={onClose} aria-label="Close panel">✕</button></header>
    <div className={styles.sheetBody}>{children}</div>
  </dialog>, document.body);
}
