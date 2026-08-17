import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const source = resolve("node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs");
const destination = resolve("public/maplibre-gl-worker.mjs");

await mkdir(dirname(destination), { recursive: true });
await copyFile(source, destination);
console.log("MapLibre worker copied to public/maplibre-gl-worker.mjs");
