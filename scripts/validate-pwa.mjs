import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const publicDir = path.join(root, "public");

function fail(message) {
  console.error(`PWA validation failed: ${message}`);
  process.exitCode = 1;
}

function requireFile(relativePath) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    fail(`Missing ${relativePath}`);
    return false;
  }

  return true;
}

const requiredFiles = [
  "public/manifest.webmanifest",
  "public/sw.js",
  "public/offline.html",
  "public/miles-meals-icon.svg",
  "public/miles-meals-icon-192.png",
  "public/miles-meals-icon-512.png",
  "public/apple-touch-icon.png",
  "public/apple-splash-750x1334.png",
  "public/apple-splash-1170x2532.png",
  "public/apple-splash-1179x2556.png",
  "public/apple-splash-1242x2688.png",
  "public/apple-splash-1290x2796.png",
  "public/apple-splash-1320x2868.png",
  "public/apple-splash-1668x2388.png",
  "public/apple-splash-2048x2732.png",
];

for (const relativePath of requiredFiles) {
  requireFile(relativePath);
}

const manifestPath = path.join(
  publicDir,
  "manifest.webmanifest",
);

try {
  const manifest = JSON.parse(
    fs.readFileSync(manifestPath, "utf8"),
  );

  if (manifest.display !== "standalone") {
    fail("manifest display must be standalone");
  }

  if (!manifest.start_url) {
    fail("manifest start_url is required");
  }

  if (
    !Array.isArray(manifest.icons) ||
    manifest.icons.length < 2
  ) {
    fail("manifest must contain mobile icons");
  }

  if (
    !Array.isArray(manifest.shortcuts) ||
    manifest.shortcuts.length < 1
  ) {
    fail("manifest shortcuts are missing");
  }
} catch (error) {
  fail(
    error instanceof Error
      ? error.message
      : "Unable to parse manifest",
  );
}

const serviceWorkerPath = path.join(publicDir, "sw.js");

if (fs.existsSync(serviceWorkerPath)) {
  const serviceWorker = fs.readFileSync(
    serviceWorkerPath,
    "utf8",
  );

  if (!serviceWorker.includes('"/offline.html"')) {
    fail("service worker does not reference offline shell");
  }

  if (!serviceWorker.includes('request.mode === "navigate"')) {
    fail("service worker has no navigation fallback");
  }
}

if (!process.exitCode) {
  console.log("PWA validation passed.");
}
