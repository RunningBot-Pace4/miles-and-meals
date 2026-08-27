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

        <div className="living-loader" aria-hidden="true">
          <img src="/icons/v91-1/living-journey-loader.gif" width="220" height="220" alt="" />
          <span>Move · Plan · Spend · People</span>
        </div>

        {showCopy ? (
          <div className="trip-loading-copy">
            {title ? <h2>{title}</h2> : null}
            {message ? <p>{message}</p> : null}
          </div>
        ) : null}

        <div className="trip-loading-foot">
          <span className="trip-loading-pulse" />
          <small>Your Living Journey is coming together</small>
        </div>
      </div>
    </div>
  );
}
