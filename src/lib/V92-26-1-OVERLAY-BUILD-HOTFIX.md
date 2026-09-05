# V92.26.1 — Overlay build hotfix

## Cause

The V92.26 full-source archive correctly omitted the retired
`src/lib/route-recovery.ts` module. When the archive was extracted over an
older project instead of into a clean directory, however, that obsolete file
could remain on disk. The V92.25 release gate then stopped the build before
Next.js compilation.

## Correction

- Added the retired route-recovery module to the existing legacy cleanup list.
- The cleanup runs before all V92 release validators during `npm run build`.
- Clean installations remain unchanged; overlaid installations now remove the
  stale file automatically.
- The V92.26 single-navigation behavior and PWA cache remain unchanged.

No Neon migration is required.
