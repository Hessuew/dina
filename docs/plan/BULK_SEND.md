markdown

# Handoff — WhatsApp bulk-send fixes: silent-failure log + per-campaign lock

**Date:** 2026-07-04  
**Branch:** `07-04-_feat_whatsapp_add_whatsapp_messages_table_with_rls_add_lavish_skill_`

---

## What happened in this session

A senior-engineer code review was run against the unstaged WhatsApp bulk-send changes
on the current branch. Two production-relevant issues were found and a fully grilled,
approved implementation plan was produced. No code was written — the implementing agent
picks up here.

---

## Context pointers (read before touching code)

| Artifact                                                    | Path                                                     |
| ----------------------------------------------------------- | -------------------------------------------------------- |
| Domain glossary (WhatsApp Campaign, Message Template, etc.) | `CONTEXT.md` → WhatsApp Campaign section                 |
| Architectural decision for the feature                      | `docs/adr/0014-whatsapp-cloud-api-template-messaging.md` |
| Engineering invariants                                      | `docs/ENGINEERING_GUIDE.md`                              |
| Complexity limits                                           | `docs/rules/complexity.md`                               |

Key source files:

- Service: `src/utils/whatsapp/service/whatsapp.service.ts`
- Repository: `src/utils/whatsapp/repository/whatsapp.repository.ts`
- DB schema: `src/db/schema/whatsapp.schema.ts`
- Server fns: `src/utils/whatsapp/whatsapp.ts`
- Dialog: `src/components/enrollment/whatsapp-campaign-dialog/WhatsAppCampaignDialog.tsx`
- Domain: `src/components/enrollment/whatsapp-campaign-dialog/whatsapp-campaign-dialog.domain.ts`
- Integration tests: `src/utils/whatsapp/whatsapp.integration.test.ts`
- Errors: `src/utils/errors.ts`

---

## Fix 1 — `sendPlannedMessage` silent-failure bug (correctness)

**Root cause.** `sendPlannedMessage` wraps BOTH the provider `send()` call AND the
`insertWhatsAppMessage` log write in a single try/catch. If the provider send succeeds
but the DB insert for `status='sent'` throws (transient DB error), the catch block runs
and inserts a `status='failed'` row instead. Because `findSentEnrollmentIdsByTemplate`
only dedupes on `status='sent'`, a re-run retries this enrollment → duplicate WhatsApp
message delivered.

**Fix.** Separate the provider try/catch from the DB insert:

1. Wrap ONLY `getWhatsAppSender().send(...)` in try/catch.
2. On provider error: capture `errorMessage`, leave `providerMessageId` undefined.
3. Derive `status: 'sent' | 'failed'` from whether `providerMessageId` is set.
4. Call `insertWhatsAppMessage` unconditionally with the derived status.
5. If the DB insert itself throws, let it propagate — the batch aborts and the
   client sees a real error rather than a silent 'failed' log for a delivered message.

```ts
// Replace the existing sendPlannedMessage body:
async function sendPlannedMessage(
  planned: PlannedSend,
  templateName: WhatsAppTemplateName,
  userId: string,
): Promise<'sent' | 'failed'> {
  let providerMessageId: string | undefined
  let errorMessage: string | undefined
  try {
    ;({ providerMessageId } = await getWhatsAppSender().send({
      toE164: planned.e164,
      templateName,
      recipientName: planned.recipientName,
    }))
  } catch (error) {
    console.error('WhatsApp send failed:', error)
    errorMessage = error instanceof Error ? error.message : String(error)
  }
  const status: 'sent' | 'failed' = providerMessageId ? 'sent' : 'failed'
  await insertWhatsAppMessage({
    enrollmentId: planned.enrollmentId,
    recipientPhone: planned.e164,
    templateName,
    status,
    providerMessageId: providerMessageId ?? null,
    errorMessage,
    sentByUserId: userId,
  })
  return status
}
No new files. No new tests required (existing integration tests still pass; the failure-isolation test covers provider errors; DB-insert failures are an infrastructure concern outside PGlite test scope).

Fix 2 — Per-campaign lock (concurrent-send prevention)
Root cause. planCampaign reads the dedupe set once before any messages are sent. Two admins triggering the same campaign concurrently both read an identical (empty or partial) dedupe set, both plan the same cohort, and both send → duplicate messages. withRequestCache is an AsyncLocalStorage scope guard (role-check cache only); it does not deduplicate across concurrent HTTP requests.

Decisions (grilled and approved):

Lock granularity: per-campaign (not dialog-level — the two campaigns are independent).
Lock trigger: campaign-selection click (alongside the preview request, not dialog-open).
TTL: 5 minutes, no heartbeat. A 100-message batch runs in ≤10 s; TTL covers batch + deliberation. Heartbeat adds disproportionate complexity for team size.
Step-by-step implementation
1. Add CAMPAIGN_LOCKED error — src/utils/errors.ts
Add to the AppErrorCode union:



ts
| 'CAMPAIGN_LOCKED'
Add after ConflictError:



ts
export class CampaignLockedError extends AppError {
  constructor() {
    super({
      code: 'CAMPAIGN_LOCKED',
      status: 409,
      userMessage: 'This campaign is currently in use. Please try again shortly.',
    })
    this.name = 'CampaignLockedError'
  }
}
2. New DB table — src/db/schema/whatsapp.schema.ts
Append after whatsappMessages:



ts
export const whatsappCampaignLocks = pgTable(
  'whatsapp_campaign_locks',
  {
    campaign: text('campaign').primaryKey(),
    lockedByUserId: uuid('locked_by_user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    lockedAt: timestamp('locked_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at').notNull(),
  },
  () => [
    pgPolicy('admins_manage_campaign_locks', {
      for: 'all',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
      withCheck: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
  ],
)
Export from src/db/schema.ts (already re-exports everything from whatsapp.schema via export * from './schema/whatsapp.schema' — no change needed if that glob is already in place; verify).

3. Generate migration



bash
bun run drizzle-kit generate
Commit the generated file in drizzle/.

4. Repository functions — src/utils/whatsapp/repository/whatsapp.repository.ts
Add imports: whatsappCampaignLocks from @/db/schema; lt, gt from drizzle-orm.

Add inside the /* v8 ignore */ block:



ts
const LOCK_TTL_MS = 5 * 60 * 1000

/**
 * Atomically acquires the per-campaign lock for userId.
 * Returns true if acquired (inserted or renewed), false if held by another admin.
 * Uses INSERT … ON CONFLICT DO UPDATE WHERE (expired OR same user) RETURNING —
 * empty RETURNING means the conflict row was left untouched (held by someone else).
 */
export async function acquireWhatsAppCampaignLock(
  campaign: CampaignType,
  userId: string,
): Promise<boolean> {
  const db = await getDb()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + LOCK_TTL_MS)
  const rows = await db
    .insert(whatsappCampaignLocks)
    .values({ campaign, lockedByUserId: userId, lockedAt: now, expiresAt })
    .onConflictDoUpdate({
      target: whatsappCampaignLocks.campaign,
      set: { lockedByUserId: userId, lockedAt: now, expiresAt },
      where: or(
        lt(whatsappCampaignLocks.expiresAt, sql`NOW()`),
        eq(whatsappCampaignLocks.lockedByUserId, userId),
      ),
    })
    .returning({ lockedByUserId: whatsappCampaignLocks.lockedByUserId })
  return rows.length > 0
}

export async function releaseWhatsAppCampaignLock(
  campaign: CampaignType,
  userId: string,
): Promise<void> {
  const db = await getDb()
  await db
    .delete(whatsappCampaignLocks)
    .where(
      and(
        eq(whatsappCampaignLocks.campaign, campaign),
        eq(whatsappCampaignLocks.lockedByUserId, userId),
      ),
    )
}

export async function checkWhatsAppCampaignLockHeldBy(
  campaign: CampaignType,
  userId: string,
): Promise<boolean> {
  const db = await getDb()
  const [row] = await db
    .select({ campaign: whatsappCampaignLocks.campaign })
    .from(whatsappCampaignLocks)
    .where(
      and(
        eq(whatsappCampaignLocks.campaign, campaign),
        eq(whatsappCampaignLocks.lockedByUserId, userId),
        gt(whatsappCampaignLocks.expiresAt, sql`NOW()`),
      ),
    )
  return row !== undefined
}

export async function getLockedCampaigns(): Promise<Array<CampaignType>> {
  const db = await getDb()
  const rows = await db
    .select({ campaign: whatsappCampaignLocks.campaign })
    .from(whatsappCampaignLocks)
    .where(gt(whatsappCampaignLocks.expiresAt, sql`NOW()`))
  return rows.map((r) => r.campaign as CampaignType)
}
5. Service — src/utils/whatsapp/service/whatsapp.service.ts
Add imports for the four new repo functions and CampaignLockedError.

Update previewWhatsAppCampaignService — add lock acquisition after authz:



ts
const acquired = await acquireWhatsAppCampaignLock(data.campaign, userId)
if (!acquired) throw new CampaignLockedError()
Update sendWhatsAppCampaignService — verify lock, wrap loop in try/finally to release:



ts
const holdsLock = await checkWhatsAppCampaignLockHeldBy(data.campaign, userId)
if (!holdsLock) throw new CampaignLockedError()

const { templateName, plan } = await planCampaign(data)
let sent = 0
let failed = 0
try {
  for (const [index, planned] of plan.toSend.entries()) {
    if (index > 0) await new Promise((r) => setTimeout(r, SEND_INTERVAL_MS))
    const outcome = await sendPlannedMessage(planned, templateName, userId)
    if (outcome === 'sent') sent++ else failed++
  }
} finally {
  await releaseWhatsAppCampaignLock(data.campaign, userId).catch((e) => {
    console.error('Failed to release campaign lock after send:', e)
  })
}

return { sent, failed, skipped: summarizeSkips(plan.skipped) }
6. Server functions — src/utils/whatsapp/whatsapp.ts
Add two new server functions:



ts
export const getWhatsAppCampaignLocks = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await getCurrentUser()
    await authz(user.id).hasRole('admin')
    return getLockedCampaigns()
  },
)

export const releaseWhatsAppCampaign = createServerFn({ method: 'POST' })
  .inputValidator(sendWhatsAppCampaignSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    await releaseWhatsAppCampaignLock(data.campaign, user.id)
  })
Import authz from @/utils/authz; import the two repo functions.

7. Dialog hook + UI — WhatsAppCampaignDialog.tsx
Hook changes — useCampaignPreview:

Add lockedCampaigns: Set<CampaignType> state (init empty new Set()).
Add initLocks() async function: calls getWhatsAppCampaignLocksFn() via useServerFn(getWhatsAppCampaignLocks), sets lockedCampaigns from result.
In select():
Before calling preview: if selectedCampaign !== null && selectedCampaign !== campaign, fire-and-forget releaseFn({ data: { campaign: selectedCampaign } }).
On error: check toUserError(result.error).code === 'CAMPAIGN_LOCKED' — if true, add campaign to lockedCampaigns, set selectedCampaign(null) (do not toast). Otherwise toast as before.
In reset(): if selectedCampaign !== null, fire-and-forget release; clear
lockedCampaigns to empty set.

Expose lockedCampaigns and initLocks from the hook.
Hook changes — useWhatsAppCampaignDialog:

Accept open: boolean as a parameter.
Add useEffect(() => { if (open) void previewState.initLocks() }, [open]).
Pass open from the shell: useWhatsAppCampaignDialog(open, onOpenChange).
CampaignSelector changes:

Add prop lockedCampaigns: ReadonlySet<CampaignType>.
Per button: const isLocked = lockedCampaigns.has(value).
disabled={disabled || isLocked}
Description text: isLocked ? 'In use · try again shortly' : description
Shell (WhatsAppCampaignDialog): pass lockedCampaigns={previewState.lockedCampaigns} to CampaignSelector.

8. Integration tests — src/utils/whatsapp/whatsapp.integration.test.ts
Add a new describe('campaign lock (integration)', ...) block with these cases:

Preview acquires lock — after previewWhatsAppCampaignService, whatsapp_campaign_locks has a row for the campaign with lockedByUserId matching the caller.
Preview blocked when held — second admin calling preview for the same campaign rejects with { code: 'CAMPAIGN_LOCKED' }.
Different campaigns lockable concurrently — admin A locks 'congratulations', admin B can still preview 'signup_reminder' without error.
Send releases lock — after sendWhatsAppCampaignService, no row remains in whatsapp_campaign_locks for that campaign.
Send rejects without lock — calling sendWhatsAppCampaignService without a prior preview (no lock held) rejects with { code: 'CAMPAIGN_LOCKED' }.
Import whatsappCampaignLocks from @/db/schema in the test file.

9. Documentation
CONTEXT.md — append a new ### Campaign Lock subsection under the WhatsApp Campaign section:

A per-campaign mutex that prevents two admins from running the same WhatsApp campaign concurrently. Stored in whatsapp_campaign_locks (one row per CampaignType). Acquired when an admin clicks a campaign button in the WhatsAppCampaignDialog (alongside the preview request); released on send completion, dialog close, or campaign switch. A 5-minute TTL acts as the fallback if the browser closes without releasing. A locked campaign button shows "In use · try again shortly". See ADR 0015.

docs/adr/0015-whatsapp-campaign-lock.md — create with:

Status: Accepted, Date: 2026-07-04
Context: concurrent send race; dedupe is query-time not lock-time
Decision: per-campaign lock (not dialog-level), selection-trigger (not dialog-open), 5-min TTL (no heartbeat), atomic INSERT ON CONFLICT, verify at send, try/finally release
Consequences: preview has a side-effect (lock); migration required; orphaned locks auto-expire in ≤5 min
Verification checklist


bash
bun run verify:focused:static
bun run verify:focused:test
bun test src/utils/whatsapp # integration suite including new lock tests
bun test src/utils/errors   # CampaignLockedError added to error tests
Manual smoke test (two browser tabs, two admin accounts):

The full `quality:gate` runs once in pull-request CI; do not repeat it locally.

Tab A opens WhatsApp dialog, clicks "Congratulations" → preview loads.
Tab B opens WhatsApp dialog, clicks "Congratulations" → button shows "In use · try again shortly", disabled.
Tab B clicks "Signup reminder" → preview loads normally (different campaign).
Tab A closes dialog → Tab B's "Congratulations" button becomes available after ≤5 minutes (TTL) or immediately if Tab B refreshes the dialog.
Files to create / modify
Action	Path
Modify	src/utils/errors.ts
Modify	src/db/schema/whatsapp.schema.ts
Generate	drizzle/<next-migration>.sql + snapshot
Modify	src/utils/whatsapp/repository/whatsapp.repository.ts
Modify	src/utils/whatsapp/service/whatsapp.service.ts
Modify	src/utils/whatsapp/whatsapp.ts
Modify	src/components/enrollment/whatsapp-campaign-dialog/WhatsAppCampaignDialog.tsx
Modify	src/utils/whatsapp/whatsapp.integration.test.ts
Modify	CONTEXT.md
Create	docs/adr/0015-whatsapp-campaign-lock.md
Suggested skills
Invoke at the start of the session (in order):

caveman — reduces token usage throughout the session.
no-mistakes — run after all changes are complete to validate lint / types / tests / CI before pushing.
Do not invoke grill-with-docs — the design decisions are finalised and captured above plus in the forthcoming ADR 0015. The plan is approved; go straight to implementation.
```
