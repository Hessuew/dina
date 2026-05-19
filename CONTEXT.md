# Context

## Pending Email Change

A requested but unverified email address change. When a user submits a new email in the ProfileModal, the old email remains active in both `profiles.email` and Supabase auth until the user clicks a verification link sent to the **new** email. The pending state is stored inline on the `profiles` table (`pendingEmail`, `emailChangeTokenHash`, `emailChangeTokenExpiresAt`, `emailChangeTokenAttempts`, `lastEmailChangeRequestAt`). A new request overwrites any existing pending change.

Verification route: `/verify-email-change?token=...`

## Dark Card

Reusable styled container component for entity detail views. Features dark background (`bg-[#171717]/72`), gold accent line (`h-px w-8 bg-[#C5A059]/40`), and uppercase label (`text-[#8E816D] uppercase`).

Used in: courses, lessons, assignments detail pages.

Location: `components/ui/dark-card.tsx`

## Course Material

A `mediaLibrary` record with a `courseId` set — same table, same model as library items. Teachers upload PDF, PPTX, or DOCX files directly from the course description page. Students see only published materials (`isPublished = true`); teachers see all. Clicking a material navigates to `/library/$mediaId` (no raw download exposed). Course materials also appear in the global library page.
