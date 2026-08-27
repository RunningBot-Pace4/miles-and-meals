export function BrandedLoadingScreen({
  title,
  message,
}: {
  title?: string;
  message?: string;
}) {
  const showCopy = Boolean(title || message);

  return (
    <div
      className="trip-loading-overlay"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="trip-loading-card">
        <div className="trip-loading-brand">
          <img src="/icons/v92/icon-192.png" width="46" height="46" alt="" />
          <div>
            <strong>Miles &amp; Meals</strong>
            <span>Your trip, ready when you are.</span>
          </div>
        </div>

        <div className="v92-loading-halo" aria-hidden="true">
          <span className="v92-loading-halo-ring" />
          <span className="v92-loading-halo-core">
            <i />
            <b />
            <i />
          </span>
        </div>

        {showCopy ? (
          <div className="trip-loading-copy">
            {title ? <h2>{title}</h2> : null}
            {message ? <p>{message}</p> : null}
          </div>
        ) : null}

        <div className="trip-loading-foot">
          <span className="trip-loading-pulse" />
          <small>Getting your trip ready</small>
        </div>
      </div>
    </div>
  );
}
