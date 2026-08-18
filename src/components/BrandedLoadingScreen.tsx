import { BrandLogo } from "@/components/BrandLogo";

export function BrandedLoadingScreen() {
  return (
    <div
      className="standard-loading-screen"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="standard-loading-content">
        <BrandLogo href="" />

        <div className="standard-loading-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <div className="standard-loading-copy">
          <h2>Preparing your trip...</h2>
          <p>Loading Miles &amp; Meals</p>
        </div>
      </div>
    </div>
  );
}
