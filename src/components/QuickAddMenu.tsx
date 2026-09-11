"use client";

import { useEffect, useRef } from "react";
import { FullPageLink as Link } from "@/components/FullPageLink";

export function QuickAddMenu() {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const close = () => dialog.current?.close();
    window.addEventListener("pageshow", close);
    return () => window.removeEventListener("pageshow", close);
  }, []);
  return <>
    <button type="button" className="nav-item nav-action" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>
      <span className="nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg></span><span>Add</span>
    </button>
    <dialog ref={dialog} className="quick-add-dialog" aria-labelledby="quick-add-title" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="quick-add-content">
        <div className="quick-add-heading"><div><p className="eyebrow">MAKE A MEMORY</p><h2 id="quick-add-title">Add to your trip</h2></div><button type="button" className="button secondary" aria-label="Close Add menu" onClick={() => dialog.current?.close()}>✕</button></div>
        <div className="quick-add-options">
          {[
            ["/expenses/new", "Expense", "Scan a receipt or enter an amount", "＋"],
            ["/planner?add=1", "Plan", "An activity, checklist or packing item", "▦"],
            ["/memories", "Memory", "Save a moment from your trip", "♡"],
            ["/documents", "Document", "Keep travel documents together", "▤"],
          ].map(([href, title, subtitle, icon]) => <Link href={href} key={href} className="quick-add-option"><span aria-hidden="true">{icon}</span><span><strong>{title}</strong><small>{subtitle}</small></span><span aria-hidden="true">›</span></Link>)}
        </div>
      </div>
    </dialog>
  </>;
}
