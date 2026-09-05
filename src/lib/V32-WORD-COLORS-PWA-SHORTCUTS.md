# Miles & Meals v32 — Word Colors + iOS/Android Home Screen

## Heading colors

The Home headings no longer use one smooth gradient.

Each word cycles through a readable travel palette:

- lagoon teal
- coral
- warm amber
- sea blue

This applies to:

- Welcome back, <name>.
- Make every mile, meal & memory count.
- Current trip name

Desktop trip/welcome headings remain one line when space allows.
Mobile can wrap naturally.

## PWA / Home Screen

Miles & Meals now includes:

- 180x180 Apple touch icon
- 192x192 PNG app icon
- 512x512 PNG app icon
- SVG fallback icon
- Web app manifest id and scope
- lightweight service worker registration
- install / Home Screen help card under More

## Android shortcuts

The web app manifest includes:

- Add expense
- Plan
- Map
- Settle Up

After the PWA is installed in a supported Android browser, these can appear
when the user long-presses the Miles & Meals app icon.

## iPhone / iPad

The More page explains:

1. Open Miles & Meals in Safari.
2. Tap Share.
3. Choose Add to Home Screen.

The installed Home Screen web app opens in standalone mode.

The app does not promise Android-style manifest long-press quick actions on
iPhone/iPad.

## Database

No database schema change is required for v32.

## Run

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm install
npm test
npm run build
npm run dev
```

For service-worker registration, test the production build or deployed HTTPS
site as well.
