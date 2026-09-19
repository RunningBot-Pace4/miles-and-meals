# Import and place card layout update

- Import review rows use a responsive grid. Opening an exact pin editor gives the map its own full-width row, keeping names and category controls readable.
- Places, Meals and Shopping use compact tinted cards. Map and Details are primary actions; More actions contains editing, exact pin correction, adding an expense and deletion. Manual reordering is shown when Plan order is selected.
- Phone layouts stack cards in a single column, retain 44px action targets and use 16px pin input text.
- Shared pin editors are constrained to their containers in import, accommodation and saved-place views.
- Service-worker static cache revision updated.

Deploy the complete project to Vercel using the existing environment variables. This ZIP does not deploy automatically or alter database records.

Validation: unit tests and production build. Real iPhone installed-PWA and authenticated production flows still require device verification after deployment. No claim of a complete live app audit is made.

## Walking/driving and itinerary PWA update

- Places, Meals and Shopping now calculate routes from the stay with Walking (default) or Driving, using Geoapify Routing API. The selected route distances control nearest/farthest sorting; estimated minutes are shown alongside kilometres.
- Requires the existing server-only GEOAPIFY_API_KEY environment variable. Free-plan API allowances still apply. No Google paid API is used.
- Route responses are cached for a day on the server and reused in the current planner session. Changing coordinates or travel mode produces a new lookup. Missing routes are not replaced with straight-line estimates.
- Import preview distances remain explicitly labelled straight-line; saved-place views use the selected walking/driving route. Provider routes may differ from Google Maps and estimated times do not include live traffic.
- Mobile itinerary cards now retain padding and wrap action buttons. Undated accommodation uses a compact Your stay banner; coordinate metadata stays saved but is omitted from card notes.
- Validation: 375 unit tests passed; four database integration tests skipped. Provider responses tested with mocks. Live route calls and installed iPhone PWA are not verified in this environment.
