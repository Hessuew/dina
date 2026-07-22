# ADR 0015 — WhatsApp Campaign Lock

**Status:** Accepted
**Date:** 2026-07-04

## Context

A campaign send dedupes at query time, not lock time: `planCampaign` reads the set of
already-`sent` enrollment ids once, before any message goes out. Two admins triggering the
same campaign concurrently both read an identical (empty or partial) dedupe set, both plan
the same cohort, and both send — recipients get duplicate WhatsApp messages.
The global request-scope AsyncLocalStorage caches authz checks only within one request; it
does not deduplicate across concurrent HTTP requests. Its historical name was
`withRequestCache`.

## Decision

**A per-campaign advisory lock stored in a `whatsapp_campaign_locks` table (one row per
`CampaignType`), acquired atomically on campaign selection and verified at send.**

- **Granularity — per campaign, not dialog-level.** The two campaigns are independent;
  admin A running `congratulations` must not block admin B running `signup_reminder`.
- **Trigger — campaign-selection click**, alongside the preview request (not dialog-open).
  Preview therefore has a side-effect: it acquires the lock.
- **TTL — 5 minutes, no heartbeat.** A 100-message batch runs in ≤10 s; the TTL covers the
  batch plus deliberation time. A heartbeat adds disproportionate complexity for the team
  size.
- **Acquisition — atomic `INSERT … ON CONFLICT DO UPDATE WHERE (expired OR same user)
RETURNING`.** An empty `RETURNING` means the conflict row was left untouched (held by
  another admin) → `CampaignLockedError` (`CAMPAIGN_LOCKED`, 409).
- **Verify at send.** `sendWhatsAppCampaignService` rejects with `CAMPAIGN_LOCKED` unless
  the caller holds an unexpired lock; the send loop runs in `try/finally` and releases the
  lock on completion or failure.
- **Release paths:** send completion, dialog close, campaign switch (fire-and-forget from
  the dialog), and the TTL as the fallback when the browser closes without releasing.
- **UI:** `WhatsAppCampaignDialog` fetches locked campaigns on open and disables a locked
  campaign's button with "In use · try again shortly"; a `CAMPAIGN_LOCKED` preview error
  marks the campaign locked in place instead of toasting.

## Consequences

- Preview is no longer a pure dry run — it acquires the campaign lock as a side-effect.
- A schema migration is required (`whatsapp_campaign_locks`, admin-only RLS).
- Orphaned locks (crashed browser, lost connection) auto-expire in ≤5 minutes; no cleanup
  job is needed.
- Concurrent duplicate sends of the same campaign are prevented; the dedupe query remains
  as the re-run safety net.
