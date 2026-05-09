import { useEffect, useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Loader2, RefreshCwIcon } from 'lucide-react'
import { toast } from 'sonner'
import { toUserError } from '@/utils/errors'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import { useMutation } from '@/hooks/useMutation'
import { resendOtpFn, signupFn, verifyOtpFn } from '@/routes/signup'
import {
  checkInvitationByEmail,
  getInvitationByToken,
} from '@/utils/invitation'
import { calculatePasswordStrength } from '@/utils/password'
import graphiteBackground from '@/assets/images/bg/bg_about.webp'

function getUserFriendlyError(message: string): string {
  const lowerMessage = message.toLowerCase()

  if (
    lowerMessage.includes('email already exists') ||
    lowerMessage.includes('duplicate')
  ) {
    return 'An account with this email already exists. Please try logging in instead.'
  }
  if (
    lowerMessage.includes('invalid email') ||
    lowerMessage.includes('email format')
  ) {
    return 'Please enter a valid email address.'
  }
  if (
    lowerMessage.includes('password too short') ||
    lowerMessage.includes('password too weak')
  ) {
    return 'Your password is too weak. Please use a stronger password.'
  }
  if (lowerMessage.includes('invitation') || lowerMessage.includes('invited')) {
    return 'You need a valid invitation to sign up. Please check your invitation link.'
  }
  if (
    lowerMessage.includes('otp') ||
    lowerMessage.includes('verification code') ||
    lowerMessage.includes('code')
  ) {
    return 'The verification code you entered is incorrect. Please try again.'
  }
  if (lowerMessage.includes('expired') || lowerMessage.includes('timeout')) {
    return 'The verification code has expired. Please request a new one.'
  }
  if (
    lowerMessage.includes('rate limit') ||
    lowerMessage.includes('too many')
  ) {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  if (lowerMessage.includes('network') || lowerMessage.includes('connection')) {
    return 'Network error. Please check your connection and try again.'
  }

  return 'Something went wrong. Please try again later.'
}

interface SignupFormProps {
  token?: string
}

export function SignupForm({ token = '' }: SignupFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [invitationValid, setInvitationValid] = useState(false)
  const [invitationError, setInvitationError] = useState<string | null>(null)
  const [invitationRole, setInvitationRole] = useState<string | null>(null)
  const [isLoadingToken, setIsLoadingToken] = useState(!!token)

  const [showOtpInput, setShowOtpInput] = useState(false)
  const [otpValue, setOtpValue] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  const signupMutation = useMutation<
    {
      data: {
        email: string
        password: string
        fullName?: string
        token: string
      }
    },
    { error: boolean; requiresOtp?: boolean; email?: string; message: string }
  >({
    fn: useServerFn(signupFn),
    onSuccess: (ctx) => {
      if (ctx.data.error) {
        toast.error(getUserFriendlyError(ctx.data.message))
      } else if (ctx.data.requiresOtp) {
        setShowOtpInput(true)
        setResendCooldown(60)
        toast.success('Account created!', {
          description: ctx.data.message,
          duration: 6000,
        })
      }
    },
  })

  const router = useRouter()
  const checkEmailFn = useServerFn(checkInvitationByEmail)
  const getTokenFn = useServerFn(getInvitationByToken)

  const passwordStrength = calculatePasswordStrength(password || '')

  const verifyOtpMutation = useMutation<
    {
      data: {
        email: string
        password: string
        otp: string
        invitationToken: string
      }
    },
    { success: boolean; loginFailed?: boolean; message: string }
  >({
    fn: useServerFn(verifyOtpFn),
    onSuccess: async (ctx) => {
      if (ctx.data.success) {
        if (ctx.data.loginFailed) {
          toast.success('Email verified!', {
            description: 'Please log in to continue.',
          })
          router.navigate({ to: '/login', search: { verified: true } })
          return
        }

        toast.success('Email verified!', {
          description: 'Redirecting to dashboard...',
        })

        // Auto-login successful, redirect to dashboard
        await router.invalidate()
        router.navigate({ to: '/dashboard', search: { verified: true } })
      } else {
        toast.error(getUserFriendlyError(ctx.data.message))
      }
    },
  })

  const resendOtpMutation = useMutation<
    { data: { email: string; invitationToken: string } },
    { success: boolean; message: string }
  >({
    fn: useServerFn(resendOtpFn),
    onSuccess: (ctx) => {
      if (ctx.data.success) {
        toast.success(ctx.data.message)
        setResendCooldown(60)
      } else {
        toast.error(getUserFriendlyError(ctx.data.message))
      }
    },
  })

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  // Auto-fill email from token on mount
  useEffect(() => {
    if (token) {
      setIsLoadingToken(true)
      getTokenFn({ data: { token } })
        .then((result) => {
          setEmail(result.invitation.email)
          setInvitationValid(true)
          setInvitationRole(result.invitation.role)
        })
        .catch((error) => {
          const userError = toUserError(error)
          setInvitationError(userError.message)
          toast.error('Invalid invitation', {
            description: userError.message,
          })
        })
        .finally(() => {
          setIsLoadingToken(false)
        })
    }
  }, [token, getTokenFn])

  const handleEmailBlur = async () => {
    if (!email || email.length < 3) return

    setIsCheckingEmail(true)
    setInvitationError(null)

    try {
      const result = await checkEmailFn({ data: { email } })
      setInvitationValid(true)
      setInvitationRole(result.invitation.role)
      setInvitationError(null)
    } catch (error) {
      const userError = toUserError(error)
      setInvitationError(userError.message)
      setInvitationValid(false)
      toast.error('Email not invited', {
        description: userError.message,
      })
    } finally {
      setIsCheckingEmail(false)
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!invitationValid) {
      setInvitationError('Please enter a valid email with an invitation')
      return
    }

    const formData = new FormData(e.target as HTMLFormElement)
    const passwordValue = formData.get('password') as string
    const confirmPassword = formData.get('confirm-password') as string
    const tokenField = formData.get('token') as string

    if (passwordValue !== confirmPassword) {
      alert('Passwords do not match')
      return
    }

    signupMutation.mutate({
      data: {
        email,
        password: passwordValue,
        fullName: formData.get('name') as string,
        token: tokenField,
      },
    })
  }

  const handleOtpComplete = (value: string) => {
    setOtpValue(value)
    if (value.length === 6) {
      verifyOtpMutation.mutate({
        data: {
          email,
          password,
          otp: value,
          invitationToken: token,
        },
      })
    }
  }

  const handleResendOtp = () => {
    if (resendCooldown > 0) return
    resendOtpMutation.mutate({
      data: {
        email,
        invitationToken: token,
      },
    })
  }

  const pageShell = (rightPanel: React.ReactNode) => (
    <section
      className="relative isolate min-h-svh overflow-hidden border-b border-[#C5A059]/14 bg-[#121212] text-[#F8F4EC]"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(10,10,11,0.9), rgba(16,16,17,0.95)), url(${graphiteBackground})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(197,160,89,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.06),transparent_22%)]" />

      <div className="relative mx-auto max-w-[calc(100%-2rem)] px-5 py-18 sm:max-w-[calc(100%-4rem)] sm:px-8 sm:py-22 lg:max-w-[calc(100%-8rem)] lg:px-12 lg:py-24">
        <div className="grid items-start gap-14 lg:grid-cols-[minmax(0,0.85fr)_minmax(24rem,1.15fr)] lg:gap-20">
          <div className="flex h-full flex-1 flex-col justify-between space-y-10">
            <div className="space-y-6">
              <div className="inline-flex flex-col gap-2 text-[0.72rem] font-medium tracking-[0.3em] text-[#9B7A41] uppercase">
                <div className="h-px w-20 bg-[#C5A059]/50 lg:w-28" />
                <div className="flex flex-row items-center gap-3">
                  <span className="h-px w-10 bg-[#C5A059]/55" />
                  Signup Portal
                </div>
              </div>

              <h1 className="max-w-[12ch] font-serif text-[clamp(3rem,5vw,5.2rem)] leading-[0.92] tracking-[-0.055em] text-[#F8F4EC]">
                {showOtpInput ? 'Verify your email' : 'Create account'}
              </h1>

              <p className="max-w-xl text-base leading-8 font-light tracking-[0.04em] text-[#CFC6B7] sm:text-lg">
                "Through desire a man, having separated himself, seeketh and
                intermeddleth with all wisdom."
                <br />
                <span className="text-[0.72rem] font-medium tracking-[0.2em] text-[#9B7A41] uppercase">
                  Proverbs 18:1
                </span>
              </p>
            </div>

            <div className="border-t border-white/10 pt-8 text-[0.65rem] font-medium tracking-[0.18em] text-[#8E816D] uppercase">
              <div>© {new Date().getFullYear()} DINA</div>
              <a
                href="https://cherubim-it.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block transition-colors hover:text-[#C5A059]"
              >
                Cherubim IT
              </a>
            </div>
          </div>

          <div className="relative border border-white/10 bg-[#171717]/72 p-4 shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)] backdrop-blur-sm sm:p-6">
            <div
              className="relative overflow-hidden border border-white/10"
              style={{
                backgroundImage: `linear-gradient(180deg, rgba(7,7,8,0.26), rgba(7,7,8,0.72)), url(${graphiteBackground})`,
                backgroundPosition: 'center',
                backgroundSize: 'cover',
              }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),transparent_38%,rgba(197,160,89,0.14)_100%)]" />
              <div className="relative flex min-h-48 flex-col justify-between p-6 sm:p-8">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#D4B373] uppercase">
                      Disciplers of Nations Academy
                    </div>
                    <div className="mt-3 font-serif text-[clamp(2rem,3.5vw,3rem)] leading-[0.94] tracking-[-0.045em] text-white">
                      DINA
                    </div>
                  </div>
                  <div className="border border-white/12 bg-black/18 px-4 py-3 text-[0.9rem] font-medium tracking-[0.26em] text-[#E9D9B4] uppercase">
                    {new Date().getFullYear()}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-x border-b border-white/10 bg-[#151515]/88 px-6 py-7 sm:px-8 sm:py-8">
              <div className="border border-white/10 bg-white/3 p-5 shadow-[0_22px_36px_-30px_rgba(0,0,0,0.4)]">
                {rightPanel}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )

  if (showOtpInput) {
    return pageShell(
      <Field>
        <div className="mb-5 space-y-1">
          <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
            Verification code
          </div>
          <p className="text-sm leading-6 text-[#D6CCBE]">
            Enter the code sent to{' '}
            <span className="text-[#E9D9B4]">{email}</span>
          </p>
        </div>

        <InputOTP
          maxLength={6}
          id="otp-verification"
          value={otpValue}
          onChange={handleOtpComplete}
          disabled={verifyOtpMutation.status === 'pending'}
        >
          <InputOTPGroup className="*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl">
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
          </InputOTPGroup>
          <InputOTPSeparator className="mx-2" />
          <InputOTPGroup className="*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl">
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>

        {verifyOtpMutation.status === 'pending' && (
          <FieldDescription
            theme="dark"
            className="mt-3 flex items-center gap-2"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            Verifying code...
          </FieldDescription>
        )}
        <FieldDescription theme="dark" className="mt-2">
          Code expires in 10 minutes.
        </FieldDescription>

        <button
          type="button"
          onClick={handleResendOtp}
          disabled={
            resendCooldown > 0 || resendOtpMutation.status === 'pending'
          }
          className="mt-4 inline-flex cursor-pointer items-center gap-2 text-[0.68rem] font-medium tracking-[0.14em] text-[#9B8A73] uppercase transition-colors hover:text-[#C5A059] disabled:opacity-40"
        >
          <RefreshCwIcon className="h-3 w-3" />
          {resendCooldown > 0
            ? `Resend (${resendCooldown}s)`
            : resendOtpMutation.status === 'pending'
              ? 'Sending...'
              : 'Resend Code'}
        </button>
      </Field>,
    )
  }

  return pageShell(
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email" theme="dark">
            Email
          </FieldLabel>
          <div className="relative">
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={handleEmailBlur}
              required
              theme="dark"
              disabled={invitationValid || isLoadingToken}
            />
            {(isCheckingEmail || isLoadingToken) && (
              <div className="absolute top-1/2 right-3 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-[#9B8A73]" />
              </div>
            )}
          </div>
          {isCheckingEmail && (
            <FieldDescription theme="dark">Checking email...</FieldDescription>
          )}
          {isLoadingToken && (
            <FieldDescription theme="dark">
              Loading invitation...
            </FieldDescription>
          )}
          {invitationError && (
            <FieldDescription className="text-destructive">
              {invitationError}
            </FieldDescription>
          )}
          {invitationValid && invitationRole && (
            <FieldDescription className="text-[#6FCF97]">
              ✓ Invited as {invitationRole}
            </FieldDescription>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="name" theme="dark">
            Full Name
          </FieldLabel>
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="John Doe"
            required
            theme="dark"
            disabled={!invitationValid}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="password" theme="dark">
            Password
          </FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            minLength={8}
            required
            theme="dark"
            disabled={!invitationValid}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {password && (
            <div className="mt-2">
              <div className="mb-1 flex items-center gap-3">
                <div className="h-1 flex-1 overflow-hidden bg-white/10">
                  <div
                    className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                    style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                  />
                </div>
                <span className="text-[0.65rem] font-medium tracking-[0.16em] text-[#9B8A73] uppercase">
                  {passwordStrength.label}
                </span>
              </div>
              {passwordStrength.suggestions.length > 0 && (
                <ul className="space-y-0.5 text-[0.7rem] text-[#8E816D]">
                  {passwordStrength.suggestions.map((suggestion, i) => (
                    <li key={i}>· {suggestion}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="confirm-password" theme="dark">
            Confirm Password
          </FieldLabel>
          <Input
            id="confirm-password"
            name="confirm-password"
            type="password"
            required
            theme="dark"
            disabled={!invitationValid}
          />
        </Field>

        <input type="hidden" name="token" value={token} />

        <Field className="pt-2">
          <button
            type="submit"
            disabled={
              signupMutation.status === 'pending' ||
              !invitationValid ||
              (signupMutation.data !== undefined && !signupMutation.data.error)
            }
            className="group inline-flex h-11 items-center justify-center gap-3 border border-[#C5A059]/55 bg-linear-to-b from-[#2A2A2A] to-[#111111] px-8 font-serif text-base tracking-[0.12em] text-[#E9D9B4] shadow-[0_28px_60px_-28px_rgba(0,0,0,0.7)] transition-all hover:-translate-y-0.5 hover:border-[#D6B16E] hover:text-white disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:border-[#C5A059]/55 disabled:hover:text-[#E9D9B4]"
          >
            {signupMutation.status === 'pending'
              ? 'Creating Account...'
              : 'Create Account'}
          </button>

          <FieldDescription theme="dark" className="pt-1 text-center">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-[#C5A059] underline-offset-4 transition-colors hover:underline"
            >
              Sign in
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>,
  )
}
