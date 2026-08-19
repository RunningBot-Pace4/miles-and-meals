import { BrandLogo } from "@/components/BrandLogo";

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
        <BrandLogo href="" />

        <div className="trip-loading-route" aria-hidden="true">
          <span className="trip-loading-line">
            <span />
          </span>

          <span className="trip-loading-stop active">
            <i>1</i>
            <small>Eat</small>
          </span>
          <span className="trip-loading-stop">
            <i>2</i>
            <small>Play</small>
          </span>
          <span className="trip-loading-stop">
            <i>3</i>
            <small>Sleep</small>
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
          <small>Miles &amp; Meals is keeping your trip in sync</small>
        </div>
      </div>
    </div>
  );
}
