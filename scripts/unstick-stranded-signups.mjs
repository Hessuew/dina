/**
 * Remediate users stranded by the old signup flow, which created the account and
 * marked the invitation 'accepted' BEFORE the OTP step. Anyone who never finished
 * OTP is left with an unconfirmed Supabase auth user + profile and an invitation
 * stuck at 'accepted' — so their invitation link no longer loads (it requires
 * status 'pending'). See docs/adr/0012-account-created-after-otp-verification.md.
 *
 * For each invitation at status 'accepted' whose auth user is still UNCONFIRMED,
 * this deletes the throwaway auth user + profile and resets the invitation to
 * 'pending' (clearing OTP fields), so the same link works again under the new flow.
 * Confirmed users (real completed signups) are left untouched.
 *
 * Usage (service-role env required):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... bun run scripts/unstick-stranded-signups.mjs --dry-run
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... bun run scripts/unstick-stranded-signups.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { classifyStrandedInvitation } from './unstick-stranded-signups.domain.mjs'

const dryRun = process.argv.includes('--dry-run')

function getClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment.',
    )
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function lookupAccount(supa, email) {
  const { data: profile } = await supa
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()
  if (!profile) return { userFound: false, emailConfirmedAt: null, id: null }

  const { data } = await supa.auth.admin.getUserById(profile.id)
  return {
    userFound: Boolean(data?.user),
    emailConfirmedAt: data?.user?.email_confirmed_at ?? null,
    id: profile.id,
  }
}

async function resetInvitation(supa, invitationId) {
  await supa
    .from('invitations')
    .update({
      status: 'pending',
      otp_hash: null,
      otp_expires_at: null,
      otp_attempts: 0,
      accepted_at: null,
    })
    .eq('id', invitationId)
}

async function deleteAccount(supa, id) {
  await supa.auth.admin.deleteUser(id)
  await supa.from('profiles').delete().eq('id', id)
}

async function remediate(supa, invitation) {
  const account = await lookupAccount(supa, invitation.email)
  const action = classifyStrandedInvitation(account)

  if (action === 'skip' || action === 'reset-only') {
    console.log(`skip     ${invitation.email} (confirmed user, real signup)`)
    return action
  }

  console.log(`${dryRun ? 'would ' : ''}${action}  ${invitation.email}`)
  if (dryRun) return action

  if (action === 'reset-and-delete') await deleteAccount(supa, account.id)
  await resetInvitation(supa, invitation.id)
  return action
}

async function main() {
  const supa = getClient()
  const { data: invitations, error } = await supa
    .from('invitations')
    .select('id, email, status')
    .eq('status', 'accepted')
  if (error) throw new Error(`Failed to load invitations: ${error.message}`)

  console.log(
    `${dryRun ? '[dry-run] ' : ''}${invitations.length} accepted invitation(s) to inspect\n`,
  )

  const counts = { skip: 0, 'reset-and-delete': 0, 'reset-only': 0 }
  for (const invitation of invitations) {
    counts[await remediate(supa, invitation)] += 1
  }

  console.log(
    `\nDone. skipped=${counts.skip} reset+deleted=${counts['reset-and-delete']} reset-only=${counts['reset-only']}`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
