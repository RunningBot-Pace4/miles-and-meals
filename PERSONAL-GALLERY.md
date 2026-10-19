# Personal photo and video viewer — 19 October 2026

This update adds a local viewer under More → My photo & video viewer.

## What it can access

The viewer displays only files you explicitly select on your own device. It does not automatically enumerate an entire phone photo library after a permission prompt. Administrator status does not provide access to another user's phone gallery.

On compatible browsers, Choose a folder lists recognizable photo/video files within that selected folder and its subfolders. A phone photo library may not be exposed as a selectable folder. Use Choose photos & videos instead where necessary.

## Use

1. Open More → My photo & video viewer.
2. Press Choose photos & videos and select the files you want to browse. Alternatively, choose a folder where the browser supports it.
3. Filter All / Photos / Videos, search by filename or folder, and sort by file date or name.
4. Tap a card to view the photo or play the video. Use Previous / Next to browse the filtered selection, and Close to return to the grid.
5. Clear selection releases the viewer's references; original files are not deleted.

Selecting files again replaces the current selection. File date is the last-modified date, which can differ from capture date. Files that the browser cannot decode show a preview-unavailable message. Video playback depends on the browser's supported codecs.

## Storage and access

- The viewer makes no photo/video upload request and has no server media endpoint.
- File contents stay in local browser memory for this page session. They are not shared with admins or other travelers.
- The viewer does not store the selected files, filenames or paths in a database, localStorage, IndexedDB, a backup or a URL query.
- Reopening or reloading the page requires selecting the files again.
- Only the visible page's photo thumbnails and the opened viewer use local object URLs. URLs are revoked when a thumbnail/viewer is removed or its file changes. Videos are loaded for playback only when opened.
- The app's existing general page analytics may record that /my-gallery was visited; this viewer sends no file contents or names to analytics.
- This page requires a normal app session but provides the same local-only functionality to app users and administrators.

## Deployment and validation

No new database migration or environment variable is required. The source includes the previous named guest traveler feature. The updated source has not been deployed by the assistant.

Automated suite: 448 tests passed; four existing PostgreSQL integration tests skipped. TypeScript checks passed. The production build passed. The authenticated responsive audit route list now includes /my-gallery, and the More tab remains active on that page.

Physical-device file selection, iPhone video playback and populated-grid visual checks have not been executed. Before rollout, verify those on your target phone/browser using your own sample files. In browser developer tools, confirm selecting and viewing media makes no media-upload request. Close a playing video, clear the selection and reopen the page to verify the session-only behavior.

Reference behavior: the browser File API supplies only user-selected files; folder selection uses webkitdirectory where supported; local previews use URL.createObjectURL and URL.revokeObjectURL. This feature does not implement native full-photo-library permissions.
