import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const must = (source, marker, message) => {
  if (!source.includes(marker)) throw new Error(message);
};

const packageJson = read("package.json");
const worker = read("public/sw.js");
const action = read("src/components/SettlementActionButton.tsx");
const workspace = read("src/components/LiveSettlementWorkspace.tsx");
const css = read("src/app/v92-living-journey.css");

must(packageJson, '"version": "1.92.20"', "V92.10 package version missing");
must(packageJson, '"v92-10:check"', "V92.10 validation script missing");
must(packageJson, "npm run v92-10:check", "V92.10 validation is not in the build gate");
must(worker, "miles-meals-static-v92-20", "V92.10 service-worker cache missing");

[
  "useEffect, useRef, useState",
  "submittedActionRef",
  "setAmount(maximumAmount.toFixed(2))",
  "setAwaitingRefresh(false)",
  "busy || awaitingRefresh",
  "Refreshing balance…",
  "Partial ${submitted.action",
  'className="settlement-action-success"',
].forEach((marker) => must(action, marker, `V92.10 action-state marker missing: ${marker}`));

must(workspace, "refreshImmediately", "Settlement workspace lacks immediate refresh handling");
must(workspace, "void refresh(true)", "Settlement update does not request an immediate no-cache refresh");
must(css, "/* V92.10 · automatic partial-settlement refresh", "V92.10 feedback styling missing");

console.log("V92.10 automatic partial-settlement refresh validation passed.");
