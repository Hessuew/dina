# ADR 0020: Signed direct upload for library video files

**Status:** Accepted  
**Date:** 2026-07-22

## Context

Library media previously supported YouTube links (`file_type = video`) and documents uploaded as base64 through a TanStack Start server function into private Supabase Storage (`media-library`). Teachers need to upload real video files (MP4/WebM) up to 100MB.

Piping 100MB through the app server (Cloudflare Workers / server fn + base64) is unsuitable: request body limits, memory, and latency. Documents stay on the base64 path at 25MB; videos need a different transport.

## Decision

1. Add DB enum value `video_file` (distinct from YouTube’s `video`).
2. Mint a short-lived **signed upload URL** via Supabase admin client (`createSignedUploadUrl`). The browser PUTs the file **directly to Storage**.
3. Then create/update the `media_library` row with the resulting public object URL path (same shape documents already store). Playback and document viewing both mint a 1-hour **signed download URL** server-side for private-bucket objects.
4. On create/update for `kind = video-file`, validate the URL is a `media-library` object whose name is prefixed with the uploader’s `userId-` (or equals the existing row URL on edit without replace).

Optional thumbnail reuse the existing image upload path. Max size 100MB; MIME `video/mp4` and `video/webm` only.

## Alternatives Considered

- **Base64 / multipart through the app server** — rejected at 100MB (Worker body/memory).
- **TUS resumable uploads** — better on flaky networks; deferred until needed.
- **URL-shape discrimination without a new enum** — rejected; explicit `video_file` keeps edit/playback branches clear.
- **Client or server transcoding** — out of scope for v1; teachers use YouTube or external compress for oversized source files.

## Consequences

- New server fn `requestMediaVideoUpload` returns path/token/signedUrl/fileUrl; bytes never hit the app server.
- Failed create after a successful PUT can orphan Storage objects (accepted for v1; no GC job).
- Ops must ensure the `media-library` bucket `file_size_limit` is ≥ 100MB in each Supabase environment.
- PDF/image upload transport unchanged.
