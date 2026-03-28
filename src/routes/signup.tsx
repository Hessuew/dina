import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import { db } from '@/db'
import { invitations, profiles } from '@/db/schema'
import { env } from '@/env'
import { getSupabaseAdminClient } from '@/utils/supabase'
import { SignupForm } from '@/components/signup-form'
import { VerificationEmail } from '@/emails/VerificationEmail'

const resend = new Resend(env.RESEND_API_KEY)

export const signupFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      email: string
      password: string
      fullName?: string
      token: string
      redirectUrl?: string
    }) => d,
  )
  .handler(async ({ data }) => {
    // Validate invitation token
    const invitation = await db.query.invitations.findFirst({
      where: eq(invitations.token, data.token),
    })

    if (!invitation) {
      return {
        error: true,
        message: 'Invalid invitation token',
      }
    }

    if (invitation.status !== 'pending') {
      return {
        error: true,
        message: 'This invitation has already been used or revoked',
      }
    }

    if (new Date() > invitation.expiresAt) {
      return {
        error: true,
        message: 'This invitation has expired',
      }
    }

    if (invitation.email !== data.email) {
      return {
        error: true,
        message: 'Email does not match invitation',
      }
    }

    const supabaseAdmin = getSupabaseAdminClient()

    // Create account WITHOUT automatic email confirmation
    const { data: authData, error } = await supabaseAdmin.auth.admin.createUser(
      {
        email: data.email,
        password: data.password,
        email_confirm: false, // don't mark confirmed
      },
    )

    if (error) {
      console.error('Supabase user creation error:', error)
      return {
        error: true,
        message:
          'Unable to create your account. Please try again or contact support.',
      }
    }

    try {
      // Create user profile in database with role from invitation
      await db
        .insert(profiles)
        .values({
          id: authData.user.id,
          email: authData.user.email!,
          fullName: data.fullName || authData.user.email!.split('@')[0],
          role: invitation.role,
        })
        .onConflictDoUpdate({
          target: profiles.id,
          set: {
            fullName: data.fullName || authData.user.email!.split('@')[0],
            role: invitation.role,
          },
        })

      // Mark invitation as accepted
      await db
        .update(invitations)
        .set({
          status: 'accepted',
          acceptedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(invitations.id, invitation.id))

      // Generate verification link using Admin API
      // Use 'magiclink' type since user already exists (created with admin.createUser)
      const { data: linkData, error: linkError } =
        await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: data.email,
          options: {
            redirectTo: `${env.APP_URL || 'http://localhost:3000'}/auth/callback`,
          },
        })

      if (linkError || !linkData.properties.action_link) {
        console.error('Failed to generate verification link:', linkError)
        throw new Error(
          'Unable to send verification email. Please contact support.',
        )
      }

      // Send custom verification email via Resend
      const verificationLink = linkData.properties.action_link

      // Also mark the user as needing email confirmation in metadata
      await supabaseAdmin.auth.admin.updateUserById(authData.user.id, {
        email_confirm: false,
      })

      const emailHtml = await render(
        VerificationEmail({
          verificationLink,
        }),
      )

      const { error: emailError } = await resend.emails.send({
        from: env.RESEND_FROM_EMAIL,
        to: data.email,
        subject: 'Verify your email address',
        html: emailHtml,
      })

      if (emailError) {
        console.error('Failed to send verification email:', emailError)
        throw new Error(
          'Unable to send verification email. Please contact support.',
        )
      }

      // Return success
      return {
        error: false,
        message:
          'Account created successfully! Please check your email to verify your account.',
      }
    } catch (err) {
      // Log the technical error for debugging
      console.error('Signup error:', err)

      // Rollback: Delete Supabase user if DB operations or email sending failed
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      } catch (deleteError) {
        console.error('Failed to rollback user creation:', deleteError)
      }

      // Return user-friendly error message
      return {
        error: true,
        message:
          err instanceof Error && err.message.includes('contact support')
            ? err.message
            : 'Something went wrong during signup. Please try again or contact support.',
      }
    }
  })

export const Route = createFileRoute('/signup')({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      token: (search.token as string) || '',
    }
  },
  component: SignupComp,
})

function SignupComp() {
  const { token } = Route.useSearch()

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignupForm token={token} />
      </div>
    </div>
  )
}
