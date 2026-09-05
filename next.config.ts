import type { NextConfig } from "next";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), geolocation=(self), microphone=(), payment=(), usb=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
];

export function resolveDeploymentId(
  env: Record<string, string | undefined> = process.env,
) {
  const explicitDeploymentId = env.NEXT_DEPLOYMENT_ID;

  if (explicitDeploymentId) {
    if (!/^[A-Za-z0-9_-]{1,32}$/.test(explicitDeploymentId)) {
      throw new Error(
        "NEXT_DEPLOYMENT_ID must contain only letters, numbers, hyphens or underscores and be 32 characters or fewer.",
      );
    }

    return explicitDeploymentId;
  }

  const vercelDeploymentId = env.VERCEL_DEPLOYMENT_ID?.replace(/^dpl_/, "");
  const deploymentId =
    vercelDeploymentId ??
    env.VERCEL_GIT_COMMIT_SHA?.slice(0, 32) ??
    "miles-meals-v92-25";

  return deploymentId.replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 32);
}

const configuredDeploymentId = resolveDeploymentId();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Tag React Server Component requests with the deployment that rendered
  // the current shell. This prevents an installed PWA from silently mixing
  // route payloads across Vercel deployments during an update handoff.
  deploymentId: configuredDeploymentId,
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
      {
        source: "/manifest-v92.webmanifest",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
