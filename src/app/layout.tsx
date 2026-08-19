import type { Metadata, Viewport } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: {
    default: "Miles & Meals",
    template: "%s · Miles & Meals",
  },
  description:
    "Travel together, plan the day, split expenses and stay connected.",
  applicationName: "Miles & Meals",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/miles-meals-icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d7c74",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
