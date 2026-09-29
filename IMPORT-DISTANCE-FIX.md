# Imported place distances

The import preview calculates straight-line distance locally. The Plan list uses saved walking or driving routes. Previously importing saved the corrected coordinates but did not request those routes.

This update:
- Labels each preview distance as straight-line.
- Checks newly imported pinned places once, using the selected travel mode and saved stay pin, including meals and shops from the same upload.
- Saves successful route results through the existing shared-route API. Normal tab visits reuse saved results.
- Keeps manual Check distances / Recalculate available for existing imports, changed pins, another travel mode, interrupted checks, or failed requests.
- Distinguishes an unchecked route from a missing location pin.

Keep Plan open until checks finish. Import itself succeeds independently of routing. If the stay pin is missing, set it first. If the routing service is unavailable or its allowance is exhausted, retry later; a valid Google Maps link alone does not guarantee an available route response.

Deploy this source update to Vercel. Existing GEOAPIFY_API_KEY and the shared-route database migration are still required; no new migration is introduced. This package does not modify the live database or deployment.

Validation: 31 targeted import and routing tests passed, including corrected-pin persistence. See the delivery message for build status. Live iPhone/PWA behavior was not verified in this environment.
