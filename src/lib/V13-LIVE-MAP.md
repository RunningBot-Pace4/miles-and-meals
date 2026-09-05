# Miles & Meals v13 — Live Map Reliability

## Fixed

- Admin live pings are visible even when the Admin is not explicitly assigned
  as a country member.
- Every assigned traveler is listed, including travelers who have not shared
  a location yet.
- GPS uploads immediately on the first position fix.
- While live sharing remains active, the latest position is uploaded about
  every 15 seconds even if the traveler is standing still.
- Member locations refresh about every 5 seconds.
- A successful upload immediately refreshes the map.
- API save errors are shown instead of silently claiming that sharing works.
- The map no longer automatically jumps on every refresh.
- One-person maps center at a useful street-level zoom.
- Added "Fit everyone", refresh, live/recent/stale status, last-seen time,
  accuracy, coordinates and Google Maps links.
- OpenFreeMap Liberty is used as the map style.
- The map resizes when its responsive container changes size.

## Important mobile-web limitation

Browser geolocation requires a secure context (HTTPS). A Vercel deployment is
suitable. A phone opening an unsecured LAN URL such as `http://192.168.x.x`
may not be allowed to use GPS.

Live sharing works while the web page remains actively running. Mobile browsers
may suspend the page when the screen is locked or the browser is closed, so
Miles & Meals web GPS is not a guaranteed always-on background tracker.

## Database

No schema change is required.

```powershell
npm install
npm test
npm run build
npm run dev
```
