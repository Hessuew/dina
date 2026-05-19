import crypto from 'node:crypto'
import { useEffect, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { createServerFn, useServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { Loader2 } from 'lucide-react'
import { getDb } from '@/db'
import { profiles } from '@/db/schema'
import { getSupabaseAdminClient } from '@/utils/supabase'
import aboutBackground from '@/assets/images/bg/bg_lecturers.webp'
import {
  AuthCenteredState,
  AuthLoadingState,
} from '@/components/auth/auth-layout'

const verifyEmailChangeFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    if (!data.token) {
      return { success: false, message: 'No verification token provided.' }
    }

    const tokenHash = crypto
      .createHash('sha256')
      .update(data.token)
      .digest('hex')

    const db = await getDb()
    const user = await db.query.profiles.findFirst({
      where: eq(profiles.emailChangeTokenHash, tokenHash),
    })

    if (!user) {
      return {
        success: false,
        message: 'Invalid or expired verification link.',
      }
    }

    if (!user.emailChangeTokenExpiresAt) {
      return {
        success: false,
        message: 'Invalid or expired verification link.',
      }
    }

    if (new Date() > user.emailChangeTokenExpiresAt) {
      return {
        success: false,
        message:
          'This verification link has expired. Please request a new email change.',
      }
    }

    if (user.emailChangeTokenAttempts >= 5) {
      return {
        success: false,
        message: 'Too many failed attempts. Please request a new email change.',
      }
    }

    if (!user.pendingEmail) {
      return {
        success: false,
        message: 'Invalid or expired verification link.',
      }
    }

    const supabaseAdmin = getSupabaseAdminClient()
    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        email: user.pendingEmail,
      })

    if (updateError) {
      await db
        .update(profiles)
        .set({
          emailChangeTokenAttempts: user.emailChangeTokenAttempts + 1,
          updatedAt: new Date(),
        })
        .where(eq(profiles.id, user.id))

      return {
        success: false,
        message: 'Failed to update your email. Please try again.',
      }
    }

    await db
      .update(profiles)
      .set({
        email: user.pendingEmail,
        pendingEmail: null,
        emailChangeTokenHash: null,
        emailChangeTokenExpiresAt: null,
        emailChangeTokenAttempts: 0,
        lastEmailChangeRequestAt: null,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, user.id))

    return { success: true, message: 'Your email address has been updated.' }
  })

export const Route = createFileRoute('/verify-email-change')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: (search.token as string) || '',
  }),
  component: VerifyEmailChangeComp,
})

function VerifyEmailChangeComp() {
  const { token } = Route.useSearch()
  const [isVerifying, setIsVerifying] = useState(true)
  const [result, setResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  const verify = useServerFn(verifyEmailChangeFn)

  useEffect(() => {
    verify({ data: { token } })
      .then((res) => setResult(res))
      .catch(() =>
        setResult({
          success: false,
          message: 'Verification failed. Please try again.',
        }),
      )
      .finally(() => setIsVerifying(false))
  }, [token, verify])

  if (isVerifying) {
    return (
      <AuthLoadingState backgroundImage={aboutBackground}>
        <Loader2 className="h-8 w-8 animate-spin text-[#9B7A41]" />
      </AuthLoadingState>
    )
  }

  if (result?.success) {
    return (
      <AuthCenteredState
        backgroundImage={aboutBackground}
        eyebrow="Email Verified"
        title="Email Updated"
      >
        <p className="mt-6 text-base leading-8 font-light tracking-[0.04em] text-[#4E463D]">
          Your email address has been updated successfully. Please log in again
          to continue.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link to="/login">
            <button className="inline-flex h-11 items-center justify-center gap-3 border border-[#C5A059]/55 bg-linear-to-b from-[#2A2A2A] to-[#111111] px-8 font-serif text-base tracking-[0.12em] text-[#E9D9B4] shadow-[0_28px_60px_-28px_rgba(0,0,0,0.7)] transition-all hover:-translate-y-0.5 hover:border-[#D6B16E] hover:text-white">
              Log In
            </button>
          </Link>
        </div>
      </AuthCenteredState>
    )
  }

  return (
    <AuthCenteredState
      backgroundImage={aboutBackground}
      eyebrow="Error"
      title="Verification Failed"
    >
      <p className="mt-6 text-base leading-8 font-light tracking-[0.04em] text-[#4E463D]">
        {result?.message ?? 'The verification link is invalid or has expired.'}
      </p>

      <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
        <Link to="/login">
          <button className="inline-flex h-11 items-center justify-center border border-[#1A1A1A]/10 px-8 text-base tracking-[0.12em] text-[#1A1A1A] shadow-[0_16px_28px_-24px_rgba(0,0,0,0.28)] backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-[#C5A059]/45">
            Back to Login
          </button>
        </Link>
      </div>
    </AuthCenteredState>
  )
}
