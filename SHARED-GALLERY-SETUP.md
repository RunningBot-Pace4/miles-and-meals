# Shared gallery: deployment and use

This adds remote viewing of photos/videos deliberately uploaded by their owners. It does **not** give admins access to anyone's phone gallery, camera roll, folders, or files they have not shared. The existing named guest expense feature is included.

## Set up once

1. Back up your Neon database. In its SQL Editor, run the complete `neon-shared-media.sql` from this ZIP. It creates one table and indexes without deleting existing data. Alternatively, apply the updated Drizzle schema through your normal migration process.
2. In the Vercel project's Storage tab, create and connect a **Private Vercel Blob** store. A public store is unsuitable. Include the environments where you will use sharing. Keep preview/test and production stores separate.
3. Ensure the project has the server-only `BLOB_READ_WRITE_TOKEN` provided for that private store. Never expose it as a `NEXT_PUBLIC_` variable. Existing auth and database variables remain required. Creating storage and changing your plan have not been performed for you.
4. Upload this complete source to your repository and redeploy Vercel with `npm run build`. This feature has not been deployed to your live site by this task.
5. Open **More → Shared gallery**. Without storage configuration the screen explains that setup is required, rather than pretending to share files.

### Cost

Vercel currently offers Blob within Hobby's included limits; it is not unlimited storage. Hobby can pause Blob access when limits are reached, and paid plans can charge for usage. Private streaming also uses Function-to-browser transfer. Check your actual Vercel plan before enabling this. This app reserves at most **400 MiB** for active shared files across the app; other files, operation counts and viewing traffic are outside that cap. No paid plan or service was activated.

Official references, checked 19 October 2026:
- https://vercel.com/docs/vercel-blob/private-storage
- https://vercel.com/docs/vercel-blob/client-upload
- https://vercel.com/docs/vercel-blob/usage-and-pricing

## Owner flow

1. Sign in with your own account. Admin impersonation cannot give upload consent.
2. Choose photos/videos using the phone's file picker. Review the chosen filenames and remove any unwanted selections.
3. Read and tick the sharing notice. It explicitly identifies current/future system admins as recipients, notes possible original location metadata, and explains removal and saved-copy limits.
4. Tap **Upload & share**. Choosing a file alone does not upload it. Consent is unchecked again for each new selection/batch.
5. Your files appear under **My shared files**. Tap a file to open it or **Remove sharing** to stop future access. Removal does not delete the phone's original file.

Up to 10 files per batch, 25 MiB each, and 100 active files/reservations per owner. JPEG, PNG, WebP, MP4, MOV/QuickTime and WebM are supported. Export HEIC photos as JPEG first. Browser support for video codecs varies; MOV/MP4 may not play everywhere. Uploads require internet access and are not queued for background/offline sharing. If you close the page mid-upload, inspect pending uploads and remove unused ones.

## Admin flow

Open **More → Shared gallery → Shared with admins**. You see only the uploads whose owners explicitly shared them. Other ordinary travelers cannot list or open these files. Admins can remove a shared file as moderation. Tap **Refresh** for newly uploaded media; the list is paginated, not a live camera-roll feed.

Owners can revoke existing shares even if they leave a trip; sharing is account based, independent of trip membership and financial close. Removal rejects future app requests immediately. A file already loaded, a stream already authorized, or a copy previously saved cannot be recalled. Owners' phones are never remotely scanned.

## Operations and recovery

- Raw media stays in private Blob storage, outside Neon; Neon stores filenames, owner, size/type, consent text/version/time, pathname and state. No raw storage URL or token is sent in the gallery listing. Viewing goes through an authenticated endpoint with private/no-store responses and video byte-range support. The service worker does not cache gallery media.
- Completed upload callbacks are verified by the Blob SDK. The app checks actual stored size/type, private URL and initial file signatures before publishing. This is format validation, not an antivirus scan or video transcoding.
- Removing a file first marks it revoked, then deletes its storage object. Late callbacks cannot restore sharing. If deletion fails, the UI says cleanup is pending; app access is already denied.
- The travel JSON backup does **not** include shared-gallery metadata or original media. It also does not erase existing gallery shares during a travel-data restore. Keep a separate Neon backup and private Blob backup if those files need recovery. Restoring a Neon branch from before a revocation could restore old sharing records; review them before reopening access.
- The updated database reset scripts clear gallery metadata too, but SQL cannot delete external Blob objects. After account deletion, a DB reset, failed deletions or abandoned uploads, run the scoped cleanup below. It handles revoked files, pending uploads older than 20 minutes, and orphaned gallery objects older than 24 hours. Only the `shared-media/` prefix is examined.

With the intended database and private Blob server credentials loaded:

```bash
npx tsx scripts/cleanup-shared-media.ts
```

Review the dry-run output first. To apply those deletions:

```bash
npx tsx scripts/cleanup-shared-media.ts --apply
```

The cleanup has not been run against your production storage. Repeated runs retain small revoked metadata records for late-callback protection. Token lifetime is at most 10 minutes.

## Verification limits

Verification completed: 475 unit/API tests passed; 4 existing PostgreSQL integration tests were skipped because no test database was configured. The production build passed. No real phone media was collected. Real Vercel Blob transfers, Neon migration execution, physical iPhone PWA file picking, and cross-device playback still require testing after configuration. Test with two ordinary disposable accounts and one admin: owner uploads, admin views, another traveler is denied, owner removes, and a new admin request is denied. Also test a video seek, an aborted upload, offline selection, and the cleanup dry run.
