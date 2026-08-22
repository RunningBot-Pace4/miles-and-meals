import fs from "node:fs";
import path from "node:path";

const appRoot = path.join(process.cwd(), "src", "app");
const srcRoot = path.join(process.cwd(), "src");

function walk(dir, accept, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, accept, out);
    else if (entry.isFile() && accept(full)) out.push(full);
  }
  return out;
}

function routeFromPage(file) {
  let relative = path.relative(appRoot, path.dirname(file)).replaceAll(path.sep, "/");
  relative = relative
    .split("/")
    .filter((segment) => !(segment.startsWith("(") && segment.endsWith(")")))
    .join("/");
  if (!relative || relative === ".") return "/";
  return `/${relative}`.replace(/\/$/, "");
}

const pageRoutes = walk(appRoot, (file) => file.endsWith(`${path.sep}page.tsx`)).map(routeFromPage);
const staticRoutes = new Set(pageRoutes.filter((route) => !route.includes("[")));

function dynamicMatches(route) {
  return pageRoutes.some((candidate) => {
    if (!candidate.includes("[")) return false;
    const regex = new RegExp(
      `^${candidate
        .split("/")
        .map((part) => (part.startsWith("[") ? "[^/]+" : part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
        .join("/")}$`,
    );
    return regex.test(route);
  });
}

const sourceFiles = walk(srcRoot, (file) => /\.(ts|tsx)$/.test(file));
const missing = [];
const pattern = /(?:href|action)=["'](\/[A-Za-z0-9_./-]*)(?:\?[^"']*)?["']/g;

for (const file of sourceFiles) {
  const source = fs.readFileSync(file, "utf8");
  for (const match of source.matchAll(pattern)) {
    const route = match[1].replace(/\/$/, "") || "/";
    if (route.startsWith("/api/") || route.startsWith("/_next/") || route.includes(".")) continue;
    if (!staticRoutes.has(route) && !dynamicMatches(route)) {
      missing.push(`${path.relative(process.cwd(), file)} -> ${route}`);
    }
  }
}

if (missing.length) {
  console.error("Broken static internal route targets:\n" + missing.join("\n"));
  process.exit(1);
}

console.log(`Route integrity passed: ${pageRoutes.length} page routes and ${sourceFiles.length} source files checked.`);
