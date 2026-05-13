# ADR 0001: Custom Email Change Verification Instead of Supabase Default

**Status:** Accepted  
**Date:** 2026-05-13

## Context

When a user changes their email via `supabase.auth.updateUser({ email })` (user-scoped client), Supabase automatically sends its own confirmation emails to both the old and new address. The project uses Resend with custom branded templates for all other transactional emails (invitations, OTP signup, password reset). Supabase's default emails break that consistency and cannot be customised to match the platform's design.

## Decision

Bypass Supabase's built-in email change flow entirely. Instead:

1. Use the admin client (`supabase.auth.admin.updateUserById()`) to update auth email — this does not trigger Supabase's automatic emails.
2. Handle verification ourselves: generate a secure token, store a hash on `profiles`, and send a custom branded email to the **new** address via Resend.
3. Only commit the email change (in both `profiles.email` and Supabase auth) after the user clicks the verification link.

Rate limiting and attempt tracking follow the same pattern as password reset.

## Alternatives Considered

- **Supabase default flow** — rejected because it sends unbranded emails we cannot control and triggers confirmations to both old and new addresses.
- **Verify old email instead of new** — rejected in favour of verifying the new address to confirm the user owns it. Old email gets no notification (acceptable for this platform's threat model).
- **Verify both emails** — rejected as unnecessary complexity for an educational platform where accounts are low-risk targets.

## Consequences

- Must maintain our own token lifecycle for email changes (expiry, attempt limits, overwrite on re-request).
- Adds 5 columns to `profiles` and a new route `/verify-email-change`.
- Consistent with every other transactional email flow in the codebase.
