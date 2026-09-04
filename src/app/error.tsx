"use client";

import { useEffect, useState } from "react";
import { beginRouteRecovery } from "@/lib/route-recovery";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [recovering, setRecovering] = useState(true);

  useEffect(() => {
    const decision = beginRouteRecovery();

    if (decision === "offline") {
      window.location.replace("/offline.html");
      return;
    }

    if (decision === "manual") {
      setRecovering(false);
      return;
    }

    const timer = window.setTimeout(() => {
      window.location.replace(window.location.href);
    }, 80);

    return () => window.clearTimeout(timer);
  }, []);

  function goBack() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.assign("/dashboard");
  }

  if (recovering) {
    return (
      <main className="app-error-shell" aria-live="polite">
        <section className="app-error-card">
          <p className="eyebrow">MILES &amp; MEALS</p>
          <h1>Reconnecting to this page…</h1>
          <p>The app is matching this page with the current PWA version.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-error-shell">
      <section className="app-error-card">
        <span className="app-error-icon" aria-hidden="true">
          !
        </span>
        <p className="eyebrow">MILES &amp; MEALS</p>
        <h1>That page didn’t finish loading</h1>
        <p>
          Your connection may have changed while Miles &amp; Meals
          was updating. Try the page again, or return to the
          previous screen.
        </p>

        <div className="app-error-actions">
          <button
            className="button primary"
            type="button"
            onClick={reset}
          >
            Try again
          </button>
          <button
            className="button secondary"
            type="button"
            onClick={goBack}
          >
            Go back
          </button>
        </div>
      </section>
    </main>
  );
}
