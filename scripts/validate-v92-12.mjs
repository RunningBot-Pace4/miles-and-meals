import fs from "node:fs";

const read = (path) =>
  fs.readFileSync(path, "utf8");
const must = (
  source,
  marker,
  message,
) => {
  if (!source.includes(marker)) {
    throw new Error(message);
  }
};

const packageJson = read("package.json");
const worker = read("public/sw.js");
const crop = read("src/lib/receipt-crop.ts");
const ocr = read(
  "src/lib/receipt-ocr-client.ts",
);
const css = read(
  "src/app/v92-living-journey.css",
);
const fullAudit = read(
  "e2e/v92-9-full-pwa-audit.spec.ts",
);
const geometryAudit = read(
  "e2e/v92-12-pwa-layout.spec.ts",
);

must(
  packageJson,
  '"version": "1.92.26"',
  "V92.12 package version missing",
);
must(
  packageJson,
  '"v92-12:check"',
  "V92.12 validation script missing",
);
must(
  packageJson,
  "npm run v92-12:check",
  "V92.12 validation is not in the build gate",
);
must(
  worker,
  "miles-meals-static-v92-26",
  "V92.12 PWA cache missing",
);
must(
  crop,
  "findReceiptBounds",
  "Receipt edge detector missing",
);
must(
  crop,
  "connected area",
  "Receipt connected-area isolation missing",
);
must(
  ocr,
  "detectReceiptCrop(decoded)",
  "OCR does not crop the receipt before recognition",
);
must(
  ocr,
  'status: "Finding receipt edges"',
  "Receipt edge-detection progress is missing",
);
must(
  ocr,
  "const maxSide = 3600",
  "Receipt OCR resolution upgrade missing",
);
must(
  css,
  "/* V92.12 · phone rhythm",
  "V92.12 responsive system missing",
);
must(
  css,
  "@media (min-width: 641px) and (max-width: 1023px)",
  "Tablet-specific layout missing",
);
must(
  css,
  ".dashboard-recent-activity .travel-section-heading",
  "Recent Activity phone-heading repair missing",
);
must(
  css,
  ".dashboard-travel-shortcuts .travel-section-heading",
  "Travel Shortcuts phone-heading repair missing",
);

for (const width of [
  320,
  360,
  390,
  430,
  600,
  768,
  820,
  1024,
  1280,
]) {
  must(
    fullAudit,
    String(width),
    `Full PWA route audit is missing ${width}px`,
  );
}

for (const marker of [
  "activitySameRow",
  "shortcutSameRow",
  "panelIsRight",
  "welcomeIsLeft",
]) {
  must(
    geometryAudit,
    marker,
    `Responsive geometry assertion missing: ${marker}`,
  );
}

for (const routeMarker of [
  '"/more"',
  '"/admin/backup"',
  '"/admin/health"',
  '"/admin/insights"',
  'a[href^="/expenses/"][href$="/edit"]',
  'a[href^="/journeys/"]',
]) {
  must(
    fullAudit,
    routeMarker,
    `Full PWA route audit is missing: ${routeMarker}`,
  );
}

console.log(
  "V92.12 receipt accuracy and phone/tablet PWA validation passed.",
);
