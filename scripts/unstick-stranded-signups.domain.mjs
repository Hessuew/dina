/**
 * Classify an invitation currently stuck at status 'accepted', based on the
 * Supabase auth user backing its email. Used by unstick-stranded-signups.mjs to
 * remediate users who created an account before OTP but never verified (the old
 * signup flow marked the invitation 'accepted' before verification).
 *
 * - Confirmed user   → a real, completed signup: leave it alone ('skip').
 * - Unconfirmed user → a stranded throwaway account: delete it and reset the
 *   invitation so the same link works again ('reset-and-delete').
 * - No user at all    → nothing to delete, just reset the invitation ('reset-only').
 */
export function classifyStrandedInvitation({ userFound, emailConfirmedAt }) {
  if (userFound && emailConfirmedAt) return 'skip'
  if (userFound) return 'reset-and-delete'
  return 'reset-only'
}
