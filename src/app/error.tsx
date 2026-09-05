"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Miles & Meals] Page boundary error", error);
  }, [error]);

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
        <h1>This page didn’t finish loading</h1>
        <p>
          The page request stopped unexpectedly. Try it again without
          starting a second page load.
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

        {error.digest ? (
          <small className="app-error-reference">
            Reference: {error.digest}
          </small>
        ) : null}
      </section>
    </main>
  );
}
