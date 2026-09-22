# Open route correction

The old link used Area as the destination. Labels such as Dinner and Causeway Bay are not exact places. Flexible time labels were also moved after all timed activities.

## Using the corrected route

1. Open Plan → Itinerary and select the day.
2. Use Set map pin beside an activity to choose its actual location. Pins are saved to that itinerary item. Existing coordinate links and saved pins are reused.
3. For combined choices such as Coffee Shop / Bakehouse, select the venue you intend to visit. Add separate activities for separate stops.
4. Open route uses every saved pin in the displayed order. Missing pins are listed explicitly; no activities are silently skipped.
5. Public transport with more than two stops and days with more than five stops use individual adjacent route links. This avoids unsupported or truncated multi-stop routes on mobile.

Relative timing (After check-in, After Fire Dragon, conditional time ranges) preserves the saved/imported sequence. Fully clock-timed days can still be ordered by time. Schedule warnings are simple timing checks, not measured journey times.

Deploy the full source folder to the existing Vercel project using its existing environment variables. No database migration is required for this fix. This package has not been deployed to the live site or tested on a physical iPhone.

Google Maps URL reference: https://developers.google.com/maps/documentation/urls/get-started
