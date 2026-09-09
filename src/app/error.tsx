"use client";

import { useEffect } from "react";

export default function AppError({
  reset,
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (!navigator.onLine) {
      window.location.replace("/offline.html");
    }
  }, []);

  function goBack() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.assign("/dashboard");
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
          Something went wrong while loading this page. Try again, or return
          to the previous screen.
        </p>

        {error.digest && <p>Error reference: {error.digest}</p>}
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
