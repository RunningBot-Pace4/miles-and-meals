import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const must = (text, needle, message) => {
  if (!text.includes(needle)) throw new Error(message);
};

const packageJson = read("package.json");
const worker = read("public/sw.js");
const updater = read("src/components/PwaRegister.tsx");
const links = read("src/components/FullPageLink.tsx");
const navigationGate = read("scripts/validate-navigation.mjs");
const nav = read("src/components/MobileNav.tsx");
const css = read("src/app/v92-living-journey.css");
const notificationBell = read("src/components/NotificationBell.tsx");
const notificationCenter = read("src/components/NotificationCenter.tsx");
const collaboration = read("src/components/CollaborationPulse.tsx");
const budgetGate = read("src/components/BudgetAccessGate.tsx");
const offlineWarmup = read("src/components/OfflinePackWarmup.tsx");
const health = read("src/app/(app)/admin/health/page.tsx");
const login = read("src/components/LoginForm.tsx");

must(packageJson, '"version": "1.92.11"', "V92.2-or-newer package version missing");
must(packageJson, '"v92-2:check"', "V92.2 release gate missing");
must(packageJson, "npm run v92-2:check", "V92.2 gate is not part of prebuild");
must(worker, 'miles-meals-static-v92-11', "V92.2-or-newer service-worker cache missing");

const installBlock = worker.slice(
  worker.indexOf('self.addEventListener("install"'),
  worker.indexOf('self.addEventListener("activate"'),
);
if (installBlock.includes("self.skipWaiting(")) {
  throw new Error("V92.2 install still races the user-controlled update flow");
}

for (const marker of [
  "waitForWaitingWorker",
  "UPDATE_READY_TIMEOUT_MS",
  "UPDATE_RELOAD_TIMEOUT_MS",
  'type: "SKIP_WAITING"',
  '"failed"',
  '"Retry"',
  "window.location.reload()",
]) must(updater, marker, `V92.2 updater recovery missing: ${marker}`);

for (const marker of ['<a', 'href={href}', 'data-navigation-pending']) {
  must(links, marker, `Reliable navigation wrapper missing: ${marker}`);
}
if (links.includes("NextLink") || navigationGate.includes('relativePath === "src/components/FullPageLink.tsx"')) {
  throw new Error("Client navigation exception was not removed after the PWA transition failure");
}
must(nav, 'aria-current={active ? "page" : undefined}', "Active main destination is not exposed");
for (const marker of [
  'button[role="tab"][aria-selected="true"]',
  '.nav-item[aria-current="page"]',
]) must(css, marker, `V92.2 selected-state styling missing: ${marker}`);

must(notificationBell, "30_000", "Notification bell still polls too aggressively");
must(notificationCenter, "15_000", "Notification page still polls too aggressively");
must(collaboration, "15_000", "Collaboration polling was not tuned");
must(budgetGate, "15_000", "Budget polling was not tuned");
for (const text of [notificationBell, notificationCenter, collaboration, budgetGate]) {
  must(text, "Ref", "A tuned poller is missing in-flight protection");
}
for (const marker of ["OFFLINE_PACK_REFRESH_MS", "5 * 60_000", "refreshingRef"]) {
  must(offlineWarmup, marker, `Offline pack throttle missing: ${marker}`);
}

if (health.includes("before releasing V90")) {
  throw new Error("Health check still shows obsolete V90 release wording");
}
for (const marker of ["42P01", "Required app tables", "do not rerun a migration"]) {
  must(health, marker, `Health guidance is incomplete: ${marker}`);
}

for (const marker of [
  "mnm:remembered-login-email",
  "rememberMe: rememberLogin",
  'autoComplete="username"',
  'autoComplete="current-password"',
  "password manager",
]) must(login, marker, `Safe login memory missing: ${marker}`);

if (/localStorage\.(setItem|getItem)\([^\n]*password/i.test(login)) {
  throw new Error("V92.2 must never store a password in localStorage");
}

console.log("V92.2 PWA update recovery, selected states, speed tuning, health guidance and safe login memory validation passed.");
