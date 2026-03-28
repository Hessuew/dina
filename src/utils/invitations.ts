import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { invitations, profiles } from '@/db/schema'
import { env } from '@/env'
import {
  getSupabaseAdminClient,
  getSupabaseServerClient,
} from '@/utils/supabase'

export const createInvitation = createServerFn({ method: 'POST' })
  .inputValidator((d: { email: string; role: 'student' | 'teacher' }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    console.log('User:', user)
    if (!user) {
      return { error: true, message: 'Unauthorized' }
    }

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    })

    if (profile?.role !== 'admin') {
      return { error: true, message: 'Only admins can create invitations' }
    }

    const existingInvitation = await db.query.invitations.findFirst({
      where: eq(invitations.email, data.email),
    })

    if (existingInvitation && existingInvitation.status === 'pending') {
      return {
        error: true,
        message: 'Invitation already exists for this email',
      }
    }

    const existingProfile = await db.query.profiles.findFirst({
      where: eq(profiles.email, data.email),
    })

    if (existingProfile) {
      return { error: true, message: 'User already registered with this email' }
    }
    console.log('No existing profile')

    // Use Supabase's built-in invite system with admin client
    const supabaseAdmin = getSupabaseAdminClient()
    const { error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
        data: {
          role: data.role,
          invited_by: user.id,
        },
        redirectTo: `${env.APP_URL || 'http://localhost:3000'}/dashboard`,
      })

    if (inviteError) {
      console.log('🚀 ~ inviteError:', inviteError)
      return { error: true, message: inviteError.message }
    }

    // Store invitation record in our database for tracking
    const [invitation] = await db
      .insert(invitations)
      .values({
        email: data.email,
        role: data.role,
        invitedBy: user.id,
      })
      .returning()

    return { error: false, invitation }
  })

export const getInvitations = createServerFn({ method: 'GET' }).handler(
  async () => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: true, message: 'Unauthorized' }
    }

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    })

    if (profile?.role !== 'admin') {
      return { error: true, message: 'Only admins can view invitations' }
    }

    const allInvitations = await db.query.invitations.findMany({
      with: {
        inviter: {
          columns: {
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: (invitations, { desc }) => [desc(invitations.invitedAt)],
    })

    return { error: false, invitations: allInvitations }
  },
)

export const getInvitationByEmail = createServerFn({ method: 'GET' })
  .inputValidator((d: { email: string }) => d)
  .handler(async ({ data }) => {
    const invitation = await db.query.invitations.findFirst({
      where: eq(invitations.email, data.email),
    })

    if (!invitation) {
      return { error: true, message: 'No invitation found for this email' }
    }

    return { error: false, invitation }
  })

export const revokeInvitation = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: true, message: 'Unauthorized' }
    }

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    })

    if (profile?.role !== 'admin') {
      return { error: true, message: 'Only admins can revoke invitations' }
    }

    await db
      .update(invitations)
      .set({
        status: 'revoked',
        updatedAt: new Date(),
      })
      .where(eq(invitations.id, data.id))

    return { error: false }
  })

export const deleteInvitation = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: true, message: 'Unauthorized' }
    }

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    })

    if (profile?.role !== 'admin') {
      return { error: true, message: 'Only admins can delete invitations' }
    }

    await db.delete(invitations).where(eq(invitations.id, data.id))

    return { error: false }
  })

export const resendInvitation = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: true, message: 'Unauthorized' }
    }

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    })

    if (profile?.role !== 'admin') {
      return { error: true, message: 'Only admins can resend invitations' }
    }

    const invitation = await db.query.invitations.findFirst({
      where: eq(invitations.id, data.id),
    })

    if (!invitation) {
      return { error: true, message: 'Invitation not found' }
    }

    // Resend using Supabase's invite system with admin client
    const supabaseAdmin = getSupabaseAdminClient()
    const { error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(invitation.email, {
        data: {
          role: invitation.role,
          invited_by: user.id,
        },
        redirectTo: `${env.APP_URL || 'http://localhost:3000'}/dashboard`,
      })

    if (inviteError) {
      return { error: true, message: inviteError.message }
    }

    await db
      .update(invitations)
      .set({
        updatedAt: new Date(),
      })
      .where(eq(invitations.id, data.id))

    return { error: false }
  })
