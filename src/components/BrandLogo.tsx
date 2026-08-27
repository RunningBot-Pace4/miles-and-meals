import { FullPageLink as Link } from "@/components/FullPageLink";

type BrandLogoProps = {
  compact?: boolean;
  href?: string;
  inverse?: boolean;
};

export function BrandLogo({
  compact = false,
  href = "/dashboard",
  inverse = false,
}: BrandLogoProps) {
  const content = (
    <>
      <span className="brand-logo-mark" aria-hidden="true">
        <img src="/icons/v91-1/icon-192.png" width="48" height="48" alt="" />
      </span>
      {!compact ? (
        <span className="brand-logo-copy">
          <span className="brand-logo-name">
            <span>Miles</span>
            <span className="brand-amp">&amp;</span>
            <span>Meals</span>
          </span>
          <span className="brand-logo-tagline">Your whole journey, connected.</span>
        </span>
      ) : null}
    </>
  );

  const className = inverse ? "brand-logo inverse" : "brand-logo";

  return href ? (
    <Link className={className} href={href} aria-label="Miles & Meals home">
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
