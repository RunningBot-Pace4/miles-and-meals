# Import and place card layout update

- Import review rows use a responsive grid. Opening an exact pin editor gives the map its own full-width row, keeping names and category controls readable.
- Places, Meals and Shopping use compact tinted cards. Map and Details are primary actions; More actions contains editing, exact pin correction, adding an expense and deletion. Manual reordering is shown when Plan order is selected.
- Phone layouts stack cards in a single column, retain 44px action targets and use 16px pin input text.
- Shared pin editors are constrained to their containers in import, accommodation and saved-place views.
- Service-worker static cache revision updated.

Deploy the complete project to Vercel using the existing environment variables. This ZIP does not deploy automatically or alter database records.

Validation: unit tests and production build. Real iPhone installed-PWA and authenticated production flows still require device verification after deployment. No claim of a complete live app audit is made.
