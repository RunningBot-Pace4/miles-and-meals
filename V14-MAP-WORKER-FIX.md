# Miles & Meals v14 — Map Loading Fix

## Root cause

v13 configured MapLibre to load:

`/maplibre-gl-worker.mjs`

but the project did not copy MapLibre's worker files into `public/`.

MapLibre GL JS v6 with Next.js requires both:

- `maplibre-gl-worker.mjs`
- `maplibre-gl-shared.mjs`

to be served together from the same public directory.

## v14 fix

Before `npm run dev` and `npm run build`, the project now automatically runs:

```text
scripts/copy-maplibre-worker.mjs
```

which copies both files from the installed `maplibre-gl` package into:

```text
public/maplibre/
```

The map then uses:

```text
/maplibre/maplibre-gl-worker.mjs
```

The map UI also stops waiting after 12 seconds and displays the actual
MapLibre error instead of showing "Loading map..." forever.

## Verify locally

```powershell
npm install
npm run build
npm run dev
```

Then verify these URLs in the browser:

```text
http://localhost:3000/maplibre/maplibre-gl-worker.mjs
http://localhost:3000/maplibre/maplibre-gl-shared.mjs
```

They should return JavaScript rather than 404.

No Neon schema change is required.
