import { readFileSync } from "node:fs";
import { resolveDeploymentId } from "../next.config.ts";

const read = (path) => readFileSync(path, "utf8");
const packageJson = read("package.json");
const nextConfig = read("next.config.ts");

function must(content, marker, message) {
  if (!content.includes(marker)) throw new Error(message);
}

must(packageJson, '"v92-25-1:check"', "V92.25.1 release gate missing");
must(packageJson, "npm run v92-25-1:check", "V92.25.1 gate is not in prebuild");
must(packageJson, '"allowScripts"', "Dependency install-script review policy missing");
must(nextConfig, "VERCEL_DEPLOYMENT_ID", "Vercel's unique deployment identity is not used");
must(nextConfig, ".slice(0, 32)", "Deployment IDs are not capped at Vercel's limit");

const fullGitSha = "2e8de4fbcccdfbd422828e10150251add4290d06";
const deploymentId = resolveDeploymentId({ VERCEL_GIT_COMMIT_SHA: fullGitSha });

if (deploymentId.length > 32) {
  throw new Error(`Deployment ID is still too long: ${deploymentId.length}`);
}

if (deploymentId !== fullGitSha.slice(0, 32)) {
  throw new Error("Git deployment fallback is not deterministic");
}

console.log("V92.25.1 Vercel deployment ID and reviewed install-script gate passed.");
