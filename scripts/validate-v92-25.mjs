import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const must = (source, marker, message) => {
  if (!source.includes(marker)) throw new Error(message);
};

const packageJson = read("package.json");
const worker = read("public/sw.js");
const expenseForm = read("src/components/ExpenseForm.tsx");
const css = read("src/app/v92-living-journey.css");
const navigation = read("src/components/FullPageLink.tsx");
const mobileNav = read("src/components/MobileNav.tsx");
const recovery = read("src/lib/route-recovery.ts");
const appError = read("src/app/error.tsx");
const globalError = read("src/app/global-error.tsx");
const launchDismiss = read("src/components/PwaLaunchDismiss.tsx");
const nextConfig = read("next.config.ts");

must(packageJson, '"version": "1.92.25"', "V92.25 package version missing");
must(packageJson, '"v92-25:check"', "V92.25 release gate missing");
must(packageJson, "npm run v92-25:check", "V92.25 gate is not in prebuild");
must(worker, "miles-meals-static-v92-25", "V92.25 PWA cache missing");

for (const retiredMarker of [
  "Split by receipt items",
  "Apply itemized split",
  "applyReceiptItemizedSplit",
  "setReceiptItems",
  "setReceiptItemAssignees",
]) {
  if (expenseForm.includes(retiredMarker)) {
    throw new Error(`Retired receipt-item split remains in the expense flow: ${retiredMarker}`);
  }
}

for (const marker of [
  "preserveInitialItemization",
  "ordinary metadata edit never destroys existing expense history",
  "receiptResult.rawText",
]) {
  must(expenseForm, marker, `Receipt history/scan safeguard missing: ${marker}`);
}

for (const marker of [
  "V92.25 · receipt scan PWA containment",
  "body:has(.expense-editor)",
  "touch-action: pan-y",
  "contain: inline-size",
  'body > .mobile-nav[data-app-mobile-nav="true"]',
  "position: fixed !important",
  "z-index: 10000 !important",
  "visibility: visible !important",
]) {
  must(css, marker, `Receipt PWA layout contract missing: ${marker}`);
}

for (const marker of [
  "prefetch = false",
  'data-navigation-mode="client"',
  'data-prefetch-intent={prefetch === false ? "fresh-on-tap" : "adaptive"}',
]) {
  must(navigation, marker, `Fresh single client navigation missing: ${marker}`);
}
must(mobileNav, "prefetch={false}", "Mobile navigation can reuse a stale prefetched route");
must(nextConfig, "deploymentId:", "RSC requests are not tagged with their deployment");
must(nextConfig, "NEXT_DEPLOYMENT_ID", "Platform deployment identity is not respected");
must(nextConfig, "VERCEL_GIT_COMMIT_SHA", "Vercel deployment identity is not used");
must(nextConfig, "miles-meals-v92-25", "Local deployment fallback is missing");

for (const marker of [
  "mnm:route-recovery:v92-25",
  "shouldAttemptRouteRecovery",
  'return "manual"',
  'return "reload"',
]) {
  must(recovery, marker, `Bounded route recovery missing: ${marker}`);
}
must(appError, "beginRouteRecovery", "App error boundary does not recover an interrupted route");
must(globalError, "beginRouteRecovery", "Global error boundary does not recover an interrupted route");
must(globalError, "window.location.replace(window.location.href)", "Global recovery does not fetch the current document once");
must(launchDismiss, "clearRouteRecovery", "Successful hydration does not clear the route recovery guard");

if (existsSync("src/app/loading.tsx")) {
  throw new Error("Duplicate root loading boundary returned");
}

console.log("V92.25 receipt scan, mobile navigation, viewport containment and bounded PWA recovery gate passed.");
