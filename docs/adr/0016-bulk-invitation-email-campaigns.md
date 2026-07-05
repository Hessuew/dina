# ADR 0016 — Bulk Invitation Email Campaigns

**Status:** Accepted
**Date:** 2026-07-04

## Context

Admins can already send one-off invitation emails from an approved enrollment and can run
locked WhatsApp campaigns. The same operational need exists for invitation email: approved
applicants who have not completed signup need a bounded, auditable, admin-only bulk send
that does not duplicate valid links or undo revoked invitations.

Invitation rows are unique by email, while older enrollment rows can have stale or null
`invitation_id` values. Existing one-off invitation flows already use email as the source
of truth, so the bulk email cohort must do the same to avoid duplicate invitations.

## Decision

Implement a channel-specific email campaign system mirroring the WhatsApp campaign flow.

- The only campaign is `invitation`, resolved to email type `invitation` and cohort
  `approved_not_registered`.
- Cohort lookup selects `status = 'approved'` enrollments whose invitation joined by
  `invitations.email = enrollments.email` is not `accepted`.
- Re-send eligibility is anchored on invitation `expires_at`:
  - no invitation row → create a pending student invitation and send;
  - pending, unexpired invitation → skip as `link_still_valid`;
  - pending, expired invitation → rotate token/expiry and send;
  - revoked invitation → skip as `revoked`.
- Bulk send never changes a revoked invitation back to pending.
- Each run is capped at 100 sendable recipients; overflow is skipped as `over_cap`.
- Sends are sequential with a small delay, and provider failures are logged as `failed`
  while the batch continues.
- Fresh invitation provider failure deletes the inserted invitation. Rotated invitation
  provider failure restores the old token/expiry.
- Bulk attempts are logged in `email_messages`; one-off invitation sends are not logged
  and historical sends are not backfilled.
- Email campaign locks live in `email_campaign_locks`, separate from WhatsApp locks, with
  the same preview-acquire, send-verify, release-on-send/close/switch, 5-minute TTL model.

## Consequences

- Preview has a side effect: it acquires the email campaign lock.
- The invitation `expires_at` field, not `email_messages`, remains the re-send source of
  truth.
- Admins get audit/failure visibility for bulk invitation campaigns without changing
  one-off invitation semantics.
- A separate email lock table keeps channel behavior simple and avoids coupling email and
  WhatsApp campaign availability.
- Resend batch API usage and a unified cross-channel campaign dialog are deferred until
  there is a real need for more campaign types or higher throughput.
