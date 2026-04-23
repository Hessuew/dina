import crypto from 'node:crypto'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import { getDb } from '@/db'
import { invitations, profiles } from '@/db/schema'
import { env } from '@/env'
import {
  getSupabaseAdminClient,
  getSupabaseServerClient,
} from '@/utils/supabase'
import { SignupForm } from '@/components/auth/signup-form'
import { OTPVerificationEmail } from '@/emails/OTPVerificationEmail'
import {
  resendOtpSchema,
  signupSchema,
  verifyOtpSchema,
} from '@/schemas/auth.schema'

export const verifyOtpFn = createServerFn({ method: 'POST' })
  .inputValidator(verifyOtpSchema)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const supabaseAdmin = getSupabaseAdminClient()
    const db = await getDb()

    // Find invitation by token
    const invitation = await db.query.invitations.findFirst({
      where: eq(invitations.token, data.invitationToken),
    })

    if (!invitation) {
      return {
        success: false,
        message: 'Invalid invitation',
      }
    }

    // Check if OTP exists
    if (!invitation.otpHash || !invitation.otpExpiresAt) {
      return {
        success: false,
        message: 'No verification code found. Please request a new one.',
      }
    }

    // Check if OTP expired
    if (new Date() > invitation.otpExpiresAt) {
      return {
        success: false,
        message: 'Verification code has expired. Please request a new one.',
      }
    }

    // Check max attempts
    if (invitation.otpAttempts >= 5) {
      return {
        success: false,
        message: 'Too many failed attempts. Please request a new code.',
      }
    }

    // Hash submitted OTP and compare
    const submittedOtpHash = crypto
      .createHash('sha256')
      .update(data.otp)
      .digest('hex')

    if (submittedOtpHash !== invitation.otpHash) {
      // Increment attempts
      await db
        .update(invitations)
        .set({
          otpAttempts: invitation.otpAttempts + 1,
          updatedAt: new Date(),
        })
        .where(eq(invitations.id, invitation.id))

      const attemptsLeft = 5 - (invitation.otpAttempts + 1)
      return {
        success: false,
        message: `Invalid code. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining.`,
      }
    }

    // OTP is valid - mark user as verified
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.email, data.email),
    })

    if (!profile) {
      return {
        success: false,
        message: 'User not found',
      }
    }

    // Update user email_confirm status
    await supabaseAdmin.auth.admin.updateUserById(profile.id, {
      email_confirm: true,
    })

    // Clear OTP data
    await db
      .update(invitations)
      .set({
        otpHash: null,
        otpExpiresAt: null,
        otpAttempts: 0,
        updatedAt: new Date(),
      })
      .where(eq(invitations.id, invitation.id))

    // Log in the user directly
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (loginError) {
      console.error('Auto-login failed after OTP verification:', loginError)
      return {
        success: true,
        loginFailed: true,
        message: 'Email verified! Please log in to continue.',
      }
    }

    return {
      success: true,
      loginFailed: false,
      message: 'Email verified successfully!',
    }
  })

export const resendOtpFn = createServerFn({ method: 'POST' })
  .inputValidator(resendOtpSchema)
  .handler(async ({ data }) => {
    const db = await getDb()
    // Find invitation by token
    const invitation = await db.query.invitations.findFirst({
      where: eq(invitations.token, data.invitationToken),
    })

    if (!invitation) {
      return {
        success: false,
        message: 'Invalid invitation',
      }
    }

    // Check if last OTP was sent less than 60 seconds ago
    if (invitation.otpExpiresAt) {
      const lastSentAt = new Date(
        invitation.otpExpiresAt.getTime() - 10 * 60 * 1000,
      )
      const timeSinceLastSend = Date.now() - lastSentAt.getTime()
      if (timeSinceLastSend < 60 * 1000) {
        const waitSeconds = Math.ceil((60 * 1000 - timeSinceLastSend) / 1000)
        return {
          success: false,
          message: `Please wait ${waitSeconds} seconds before requesting a new code.`,
        }
      }
    }

    // Generate new OTP using cryptographically secure random
    const otp = (
      (crypto.randomBytes(3).readUIntBE(0, 3) % 900000) +
      100000
    ).toString()
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex')
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000)

    // Update invitation with new OTP
    await db
      .update(invitations)
      .set({
        otpHash,
        otpExpiresAt,
        otpAttempts: 0,
        updatedAt: new Date(),
      })
      .where(eq(invitations.id, invitation.id))

    // Send OTP via email
    const emailHtml = await render(
      OTPVerificationEmail({
        otp,
        expiryMinutes: 10,
      }),
    )

    const resend = new Resend(env.RESEND_API_KEY)
    const { error: emailError } = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: data.email,
      subject: 'Your verification code',
      html: emailHtml,
    })

    if (emailError) {
      console.error('Failed to send OTP email:', emailError)
      return {
        success: false,
        message: 'Failed to send verification code. Please try again.',
      }
    }

    return {
      success: true,
      message: 'New verification code sent!',
    }
  })

export const signupFn = createServerFn({ method: 'POST' })
  .inputValidator(signupSchema)
  .handler(async ({ data }) => {
    const db = await getDb()
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
      // We do this onConflict because of trigger `public.handle_new_user`
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

      // Generate 6-digit OTP using cryptographically secure random
      const otp = (
        (crypto.randomBytes(3).readUIntBE(0, 3) % 900000) +
        100000
      ).toString()
      const otpHash = crypto.createHash('sha256').update(otp).digest('hex')
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

      // Store OTP hash in invitation
      await db
        .update(invitations)
        .set({
          otpHash,
          otpExpiresAt,
          otpAttempts: 0,
          updatedAt: new Date(),
        })
        .where(eq(invitations.id, invitation.id))

      // Send OTP via email
      const emailHtml = await render(
        OTPVerificationEmail({
          otp,
          expiryMinutes: 10,
        }),
      )

      const resend = new Resend(env.RESEND_API_KEY)
      const { error: emailError } = await resend.emails.send({
        from: env.RESEND_FROM_EMAIL,
        to: data.email,
        subject: 'Your verification code',
        html: emailHtml,
      })

      if (emailError) {
        console.error('Failed to send OTP email:', emailError)
        throw new Error(
          'Unable to send verification email. Please contact support.',
        )
      }

      // Return success with requiresOtp flag
      return {
        error: false,
        requiresOtp: true,
        email: data.email,
        message:
          'Account created! Please check your email for the verification code.',
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

  return <SignupForm token={token} />
}
