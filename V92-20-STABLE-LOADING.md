# V92.20 Stable Loading

V92.20 removes the visual flip and jump from Miles & Meals loading on Web and installed PWA.

## What changed

- The Halo ring no longer rotates or changes size. Only opacity changes inside fixed geometry.
- Cold PWA startup and normal route loading now use the same card, branding, Halo and status row.
- The installed PWA no longer waits for the browser's full `load` event after React is already interactive.
- The cold-start minimum is measured from navigation start, reduced to 240 ms, and dismissed with a short 140 ms opacity-only fade.
- Route loading waits 140 ms before appearing, so quick navigations no longer flash a full-screen loader.
- Save/update overlays remain immediate and have a separate semantic loading state.
- Desktop scroll locking compensates for the removed scrollbar, preventing horizontal content jumps.
- The fixed overlay uses stable `100svh` geometry across mobile browser and PWA viewport changes.

No database migration is required. Deploy the complete V92.20 source and allow the installed PWA to accept the update so `miles-meals-static-v92-20` activates.
