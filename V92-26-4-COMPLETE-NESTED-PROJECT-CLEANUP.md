# V92.26.4 — Complete nested-project cleanup

## Cause

The repository contains more of an accidental full project copy below
`src/lib`, including `src/lib/public`. Phase 8 scans JavaScript below `src`, so
ordinary bytes in duplicated Tesseract runtime files were incorrectly treated
as paid-provider source references.

## Correction

The prebuild cleanup now removes the complete set of impossible project-root
artifacts from `src/lib`: nested source, tests, scripts, public assets, browser
tests, build/dependency output, project configuration files, local OCR data and
the design preview. Genuine flat application modules directly inside
`src/lib` are preserved.

The V92.26 application behavior, navigation, rotating Halo and PWA cache are
unchanged. No Neon migration is required.
