import type { Metadata, Viewport } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import "@/app/globals.css";
import { ClientErrorReporter } from "@/components/ClientErrorReporter";
import { NetworkStatusBanner } from "@/components/NetworkStatusBanner";
import { NumericInputGuard } from "@/components/NumericInputGuard";
import { OfflineNavigationGuard } from "@/components/OfflineNavigationGuard";
import { OnlineActionGuard } from "@/components/OnlineActionGuard";
import { PwaLaunchDismiss } from "@/components/PwaLaunchDismiss";
import { PullToRefresh } from "@/components/PullToRefresh";
import { PwaRegister } from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: {
    default: "Miles & Meals",
    template: "%s · Miles & Meals",
  },
  description:
    "Your whole journey connected—move, plan, spend and travel together.",
  applicationName: "Miles & Meals",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      {
        url: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/miles-meals-icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/icons/apple-touch-icon-180.png",
  },
  appleWebApp: {
    capable: true,
    title: "Miles & Meals",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#061c33",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (sessionStorage.getItem("mnm:pwa-launch-seen") === "1") {
                  document.documentElement.dataset.pwaWarm = "true";
                }
              } catch {}
            `,
          }}
        />
        <link
          rel="apple-touch-startup-image"
          href="/apple-splash-750x1334.png"
          media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/apple-splash-1170x2532.png"
          media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/apple-splash-1179x2556.png"
          media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/apple-splash-1242x2688.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/apple-splash-1290x2796.png"
          media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/apple-splash-1320x2868.png"
          media="(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/apple-splash-1668x2388.png"
          media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/apple-splash-2048x2732.png"
          media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)"
        />
      </head>
      <body>
        <div
          id="pwa-launch-screen"
          className="pwa-launch-screen"
          aria-hidden="true"
        >
          <div className="pwa-launch-art">
            <img
              src="/icons/living-journey-loader.gif"
              alt=""
              width="96"
              height="96"
            />
            <div>
              <strong>Miles &amp; Meals</strong>
              <span>Your whole journey, connected.</span>
            </div>
          </div>
          <small>Move · Plan · Spend · People</small>
        </div>

        {children}

        <NetworkStatusBanner />
        <NumericInputGuard />
        <PullToRefresh />
        <OfflineNavigationGuard />
        <OnlineActionGuard />
        <ClientErrorReporter />
        <PwaRegister />
        <PwaLaunchDismiss />
      </body>
    </html>
  );
}
