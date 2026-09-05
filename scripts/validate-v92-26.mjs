import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const must = (source, marker, message) => {
  if (!source.includes(marker)) throw new Error(message);
};

const packageJson = read("package.json");
const nextConfig = read("next.config.ts");
const navigation = read("src/components/FullPageLink.tsx");
const mobileNav = read("src/components/MobileNav.tsx");
const appError = read("src/app/error.tsx");
const globalError = read("src/app/global-error.tsx");
const worker = read("public/sw.js");

must(packageJson, '"version": "1.92.26"', "V92.26 package version missing");
must(packageJson, '"v92-26:check"', "V92.26 release gate missing");
must(packageJson, "npm run v92-26:check", "V92.26 gate is not in prebuild");
must(worker, "miles-meals-static-v92-26", "V92.26 PWA cache missing");
must(navigation, "prefetch = null", "Adaptive link prefetch default missing");
must(navigation, 'data-navigation-mode="client"', "Client navigation mode missing");
must(mobileNav, "prefetch", "Main mobile destinations are not warmed");

for (const marker of [
  "deploymentId:",
  "NEXT_DEPLOYMENT_ID",
  "VERCEL_DEPLOYMENT_ID",
  "VERCEL_GIT_COMMIT_SHA",
]) {
  if (nextConfig.includes(marker)) {
    throw new Error(`Vercel source build still has conflicting custom skew configuration: ${marker}`);
  }
}

for (const source of [navigation, appError, globalError]) {
  for (const marker of [
    "beginRouteRecovery",
    "window.location.replace(window.location.href)",
    "NATIVE_NAVIGATION_FALLBACK_MS",
  ]) {
    if (source.includes(marker)) {
      throw new Error(`A second automatic navigation path remains: ${marker}`);
    }
  }
}

if (existsSync("src/lib/route-recovery.ts")) {
  throw new Error("Retired automatic route recovery module remains");
}

if (existsSync("src/app/loading.tsx")) {
  throw new Error("Duplicate root loading boundary returned");
}

if (!existsSync("src/app/(app)/loading.tsx")) {
  throw new Error("Authenticated Halo loading boundary missing");
}

console.log("V92.26 Vercel-managed single navigation, adaptive prefetch and manual-only error recovery gate passed.");
