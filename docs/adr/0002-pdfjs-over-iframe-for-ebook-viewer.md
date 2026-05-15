# ADR 0002: pdfjs-dist over iframe for eBook Viewer

**Status:** Accepted  
**Date:** 2026-05-14

## Context

Copyright requirements (CHR-18) prevent eBooks from being downloaded directly. Students and teachers must read documents inside the DINA platform. The existing approach opened files in a new browser tab via `window.open()`, exposing a public Supabase URL with a native browser PDF viewer that includes a download button.

Two viewer approaches were considered for PDFs:

1. `<iframe src="{url}#toolbar=0" />` — uses the browser's built-in PDF viewer. The `#toolbar=0` parameter hides the download toolbar in Chromium-based browsers but has no effect in Firefox.
2. `pdfjs-dist` with `React.lazy()` — renders the PDF in a canvas element entirely in JavaScript. No browser download UI is exposed regardless of browser.

## Decision

Use `pdfjs-dist` loaded lazily via `React.lazy()` for PDF rendering. The ~500 KB bundle is isolated to `/library/$mediaId` and cached after the first visit.

Protection is Level B (not full DRM): a short-lived Supabase signed URL (1-hour expiry) is generated server-side in `getLibraryMediaItem`. The raw public storage URL is never sent to the client. This satisfies a contractual "reasonable measures" obligation without watermarking or server-side rendering infrastructure.

The `media-library` Supabase storage bucket must be switched from **Public → Private** in the dashboard after deploying this code (deploy first, then flip the bucket).

## Alternatives Considered

- **`<iframe #toolbar=0>`** — rejected because it fails silently in Firefox. The DINA student audience browser distribution is unknown.
- **Office Online / Google Docs viewer for PDF** — rejected because the document content would leave DINA's infrastructure on every page view, potentially conflicting with the same copyright agreement the feature is meant to satisfy.
- **Full DRM** — rejected as overengineered for an educational platform where a contractual good-faith effort is sufficient.

PPTX and DOCX files (teacher presentations, not eBooks) use Microsoft Office Online viewer. Downloads from Office Online are acceptable for this content type.

## Consequences

- `pdfjs-dist` lazy chunk (~500 KB) loads only when navigating to a document detail page.
- The PDF.js worker file (`pdf.worker.min.mjs`) is served as a Vite static asset via the `?url` import pattern.
- Signed URL expiry means the viewer breaks after 1 hour without a page reload (acceptable — reload refreshes the URL).
- YouTube videos on the library detail page are now embedded inline rather than opening in a new tab.
