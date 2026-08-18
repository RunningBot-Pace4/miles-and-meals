import { BrandLogo } from "@/components/BrandLogo";

export default function Loading() {
  return (
    <main className="splash-loading" aria-live="polite" aria-busy="true">
      <div className="splash-loading-card">
        <BrandLogo href="" />
        <div className="splash-loader" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div>
          <strong>Preparing your trip…</strong>
          <p>Loading Miles &amp; Meals</p>
        </div>
      </div>
    </main>
  );
}
