import { BrandLogo } from "@/components/BrandLogo";

export function BrandedLoadingScreen({
  title = "Preparing your trip...",
  message = "Plans, expenses and balances are syncing.",
}: {
  title?: string;
  message?: string;
}) {
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
            <small>Plan</small>
          </span>
          <span className="trip-loading-stop">
            <i>2</i>
            <small>Spend</small>
          </span>
          <span className="trip-loading-stop">
            <i>3</i>
            <small>Share</small>
          </span>
        </div>

        <div className="trip-loading-copy">
          <h2>{title}</h2>
          <p>{message}</p>
        </div>

        <div className="trip-loading-foot">
          <span className="trip-loading-pulse" />
          <small>Miles &amp; Meals is keeping your trip in sync</small>
        </div>
      </div>
    </div>
  );
}
