# Trip picker and inline loading

The supplied iPhone recording shows the expense form zooming and shifting on the first tap, followed by the picker opening on the next tap. Source inspection found that the compact field's 0.9rem important rule outranked the previous 16px mobile safeguard. The final mobile rule now explicitly outranks it for trip/currency selectors, expense date and description.

Trip loading now uses a stable inline spinner/status row that becomes “Trip ready”, rather than disappearing and shifting the fields. The page stays visible. Save remains disabled until the selected trip's travelers load.

Fixed traveler loading state accidentally attached to split-preset loading. Added a 15-second traveler request timeout and explicit Retry action; aborted old requests cannot populate a new trip's list.

No database migration is needed. This is a source correction based on the video and code; the native iPhone first-tap interaction must still be verified after deployment. Do not delete the installed PWA while it has unsynced records.
