# V96 Test Build

This archive is for local/staging testing.

Included hardening in this test build:
- production email verification configuration
- payment-proof access restricted to payer/receiver/trip manager
- payment-proof blobs removed from normal settlement ledger reads
- HTTP/HTTPS planner URL validation
- HTTPS-only travel-document external links
- sensitive passport/visa/medical document blobs blocked/redacted
- offline private-document filtering moved into the database query
- canonical PWA manifest
- browser pinch zoom restored

This package intentionally keeps the V95 dependency lock for test install stability.
Do not treat this archive as the final certified V96 production release.
