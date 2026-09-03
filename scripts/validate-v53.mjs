import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  const absolute = path.join(root, relativePath);
  if (!fs.existsSync(absolute)) {
    failures.push(`Missing ${relativePath}`);
    return "";
  }
  return fs.readFileSync(absolute, "utf8");
}

function requireFile(relativePath) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    failures.push(`Missing ${relativePath}`);
  }
}

const settlementRoute = read("src/app/api/settlements/route.ts");
const push = read("src/lib/push.ts");
const settings = read("src/components/NotificationSettings.tsx");
const bell = read("src/components/NotificationBell.tsx");
const center = read("src/components/NotificationCenter.tsx");
const worker = read("public/sw.js");

if (
  !settlementRoute.includes('status: "SETTLED"') ||
  !settlementRoute.includes("payerAutoUpdated: true") ||
  !settlementRoute.includes("completed automatically")
) {
  failures.push(
    "Receiver-first settlement must complete the payer side automatically.",
  );
}

const inAppIndex = push.indexOf("await recordInAppNotifications(");
const preferenceIndex = push.indexOf("const enabled = await enabledUserIds(");
if (
  inAppIndex < 0 ||
  preferenceIndex < 0 ||
  inAppIndex > preferenceIndex
) {
  failures.push(
    "In-app notification history must be recorded before Web Push preference filtering.",
  );
}

for (const marker of [
  "getNotificationServiceWorker",
  "SERVICE_WORKER_READY_TIMEOUT_MS",
  "navigator.serviceWorker.getRegistration",
  "Always available",
]) {
  if (!settings.includes(marker)) {
    failures.push(`Notification setup missing: ${marker}`);
  }
}

if (
  !bell.includes("NOTIFICATION_POLL_INTERVAL_MS = 60_000") ||
  !center.includes("NOTIFICATION_POLL_INTERVAL_MS = 30_000") ||
  !bell.includes("refreshingRef") ||
  !center.includes("reloadingRef")
) {
  failures.push("Notification polling must use the current load-safe intervals and prevent overlapping requests.");
}

const cacheVersionMatch = worker.match(/miles-meals-static-v(\d+)/);
const cacheVersion = cacheVersionMatch ? Number(cacheVersionMatch[1]) : 0;
if (!Number.isInteger(cacheVersion) || cacheVersion < 53) {
  failures.push("Service-worker cache version must remain v53 or newer.");
}

for (const asset of [
  "public/manifest.webmanifest",
  "public/miles-meals-icon-192.png",
  "public/miles-meals-icon-512.png",
  "public/apple-touch-icon.png",
]) {
  requireFile(asset);
}

if (failures.length) {
  console.error("v53 validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("v53 settlement + notification validation passed.");
