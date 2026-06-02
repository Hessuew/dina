import { useEffect, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Loader2 } from 'lucide-react'
import aboutBackground from '@/assets/images/bg/bg_lecturers.webp'
import {
  AuthCenteredState,
  AuthLoadingState,
} from '@/components/auth/auth-layout'
import { verifyEmailChangeFn } from '@/utils/profile'

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
