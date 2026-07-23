# ADR 0022: Private storage object paths and signed access

**Status:** Accepted  
**Date:** 2026-07-23

## Context

DINA stores first-party uploads in four Supabase Storage buckets:
`avatars`, `course-thumbnails`, `media-library`, and `media-thumbnails`.
Only `media-library` was private. Other buckets exposed permanent public URLs,
and image uploads passed base64 payloads through application server functions.
Database columns also stored full Storage URLs, coupling durable records to a
delivery mechanism and making expiring signed URLs unsafe to persist.

ADR 0020 established signed direct upload and signed viewing for library video.
The same privacy and data-flow model should cover every first-party upload.

## Decision

1. All four Storage buckets are private.
2. Browser uploads use short-lived signed upload URLs. File bytes travel
   directly from browser to Supabase Storage rather than through the application
   server.
3. Upload-request services authenticate and authorize the actor, validate
   declared size and MIME type, and mint an actor-owned object path.
4. Completion services accept only paths owned by that actor, persist the path,
   and remove the superseded object after the new path is durable.
5. Database records store canonical object paths, never public or signed
   Storage URLs:
   - `profiles.avatar_path`
   - `courses.thumbnail_path`
   - `media_library.thumbnail_path`
   - `media_library.file_path`
6. External media URLs remain separate in `media_library.external_url`.
7. Authenticated read services convert authorized object paths into one-hour
   signed viewer URLs. Response DTOs retain `avatarUrl`, `thumbnailUrl`, and
   `fileUrl` display fields so presentation code does not depend on persistence
   shape.
8. Signing failures return a null display URL for optional images and a
   controlled viewer failure for required library files. Durable paths are not
   exposed as fallback browser URLs.

## Alternatives considered

- **Keep public image buckets** — rejected because permanent bearer URLs bypass
  application authorization.
- **Store signed URLs** — rejected because tokens expire and would make durable
  records time-dependent.
- **Store full public-shaped URLs for private objects** — rejected because URL
  parsing couples persistence to Supabase delivery endpoints.
- **Keep base64 server uploads for small images** — workable, but rejected as
  the default because it adds payload inflation and application-server memory
  and bandwidth without adding authorization value.
- **Derive every path without storing it** — rejected because optional,
  versioned files need a durable pointer for reads and cleanup.

## Consequences

- Bucket privacy must be changed only after signed-read code is deployed.
- Signed viewer URLs are bearer links until their one-hour expiry.
- Bucket-level file-size and MIME restrictions remain defense in depth; server
  validation controls which signed upload can be requested.
- Existing Storage URLs are backfilled to object paths by migration 0041.
- Old clients submitting a signed display URL remain compatible because
  mutation services canonicalize recognized bucket URLs back to paths.
- Failed completion after a successful direct upload can orphan an object. A
  cleanup job remains deferred, matching ADR 0020.

## Supersedes

This generalizes ADR 0020. ADR 0020 remains the history of the original library
video decision; this ADR governs all current first-party Storage buckets.
