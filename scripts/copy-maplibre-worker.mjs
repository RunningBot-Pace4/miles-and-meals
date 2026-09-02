import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const packageJsonPath = require.resolve("maplibre-gl/package.json");
const dist = path.join(path.dirname(packageJsonPath), "dist");
const destination = path.join(process.cwd(), "public", "maplibre");

mkdirSync(destination, { recursive: true });

for (const file of [
  "maplibre-gl-worker.mjs",
  "maplibre-gl-shared.mjs",
]) {
  copyFileSync(
    path.join(dist, file),
    path.join(destination, file),
  );
}

const tesseractDestination = path.join(
  process.cwd(),
  "public",
  "tesseract",
);
const tesseractCoreDestination = path.join(
  tesseractDestination,
  "core",
);
const tesseractLanguageDestination = path.join(
  tesseractDestination,
  "lang",
);
const tesseractWorkerPath = require.resolve(
  "tesseract.js/dist/worker.min.js",
);
const tesseractCorePackage = require.resolve(
  "tesseract.js-core/package.json",
);
const tesseractCoreDirectory = path.dirname(
  tesseractCorePackage,
);

mkdirSync(tesseractCoreDestination, {
  recursive: true,
});
mkdirSync(tesseractLanguageDestination, {
  recursive: true,
});

copyFileSync(
  tesseractWorkerPath,
  path.join(tesseractDestination, "worker.min.js"),
);

for (const file of [
  "tesseract-core-lstm.wasm.js",
  "tesseract-core-simd-lstm.wasm.js",
  "tesseract-core-relaxedsimd-lstm.wasm.js",
]) {
  copyFileSync(
    path.join(tesseractCoreDirectory, file),
    path.join(tesseractCoreDestination, file),
  );
}

for (const language of ["eng", "vie"]) {
  const languagePackage = require.resolve(
    `@tesseract.js-data/${language}/package.json`,
  );
  const source = path.join(
    path.dirname(languagePackage),
    "4.0.0_best_int",
    `${language}.traineddata.gz`,
  );

  copyFileSync(
    source,
    path.join(
      tesseractLanguageDestination,
      `${language}.traineddata.gz`,
    ),
  );
}

console.log(
  "[Miles & Meals] MapLibre and local English/Vietnamese OCR assets copied.",
);
