export function RouteLoadingState() {
  return (
    <section
      className="route-loading-state"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading page</span>

      <div className="route-loading-hero" aria-hidden="true">
        <span className="route-loading-line route-loading-line-short" />
        <span className="route-loading-line route-loading-line-title" />
        <span className="route-loading-line route-loading-line-medium" />
      </div>

      <div className="route-loading-grid" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className="route-loading-panel" aria-hidden="true">
        <span className="route-loading-line route-loading-line-medium" />
        <span className="route-loading-line" />
        <span className="route-loading-line route-loading-line-long" />
      </div>
    </section>
  );
}
