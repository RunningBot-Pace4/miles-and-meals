import { BrandLogo } from "@/components/BrandLogo";

export function SavingOverlay({
  title = "Saving your expense",
  message = "Updating the trip total and everyone’s share.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div
      className="saving-overlay"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="saving-panel">
        <BrandLogo href="" />
        <div className="saving-journey" aria-hidden="true">
          <span className="saving-route" />
          <span className="saving-plane">✈</span>
          <span className="saving-pin">●</span>
        </div>
        <div className="saving-copy">
          <p className="eyebrow">MILES &amp; MEALS</p>
          <h2>{title}</h2>
          <p>{message}</p>
        </div>
        <div className="saving-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
