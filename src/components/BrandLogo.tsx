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
        <svg viewBox="0 0 48 48" role="img">
          <path
            d="M24 5.5c-7.2 0-13 5.8-13 13 0 9.7 13 24 13 24s13-14.3 13-24c0-7.2-5.8-13-13-13Z"
            fill="currentColor"
          />
          <circle cx="24" cy="18.5" r="6.2" className="brand-logo-hole" />
          <path
            d="M21 14.5v8M24 14.5v8M27 14.5v8M21 18.5h6"
            className="brand-logo-fork"
          />
        </svg>
      </span>
      {!compact ? (
        <span className="brand-logo-copy">
          <span className="brand-logo-name">
            <span>Miles</span>
            <span className="brand-amp">&amp;</span>
            <span>Meals</span>
          </span>
          <span className="brand-logo-tagline">Travel together. Spend smarter.</span>
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
