# Auth & Enrolment Forms — TanStack Form Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `login-form.tsx`, `signup-form.tsx`, and `enrolment-form.tsx` to use `useAppForm`, consistent with the completed dialog migrations.

**Architecture:** Replace `useForm` / native form state with `useAppForm({ defaultValues, onSubmit })`. Use `form.AppField` + registered components (`TextField`, `SelectField`) for straightforward fields; `form.Field` render props for fields needing custom UI (invitation email, password strength, word-count textareas). Extend `TextField`'s `type` prop first since auth forms need `email`, `password`, and `tel` types.

**Tech Stack:** `@tanstack/react-form`, `useAppForm` from `@/hooks/form`, registered field components from `@/components/ui/app-form-fields.tsx`.

---

## File Map

| File | Change |
|------|--------|
| `src/components/ui/form-field.tsx` | Extend `FormFieldTextInputProps.type` union |
| `src/components/ui/app-form-fields.tsx` | Extend `TextFieldProps.type` union |
| `src/components/auth/login-form.tsx` | Replace native form → `useAppForm` |
| `src/components/auth/signup-form.tsx` | Replace `useState` email/password + native form → `useAppForm` |
| `src/components/auth/enrolment-form.tsx` | Replace `useForm` → `useAppForm`, `form.Field` → `form.AppField` for simple fields |

---

## Task 1: Extend TextField type prop

**Files:**
- Modify: `src/components/ui/form-field.tsx`
- Modify: `src/components/ui/app-form-fields.tsx`

- [ ] **Step 1: Extend type in `form-field.tsx`**

In `src/components/ui/form-field.tsx`, find `FormFieldTextInputProps` and change the `type` line:

```typescript
// Before
type?: 'text' | 'datetime-local'

// After
type?: 'text' | 'email' | 'password' | 'tel' | 'number' | 'datetime-local'
```

- [ ] **Step 2: Extend type in `app-form-fields.tsx`**

In `src/components/ui/app-form-fields.tsx`, find `TextFieldProps` and change the `type` line:

```typescript
// Before
type?: 'text' | 'datetime-local'

// After
type?: 'text' | 'email' | 'password' | 'tel' | 'number' | 'datetime-local'
```

- [ ] **Step 3: Verify**

```bash
bun lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
gt c -m "refactor(app-form-fields): extend TextField type to support email, password, tel, number"
```

---

## Task 2: Migrate LoginForm

**Files:**
- Modify: `src/components/auth/login-form.tsx`

- [ ] **Step 1: Replace the form implementation**

Replace the entire content of `src/components/auth/login-form.tsx` with:

```typescript
import { Link, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import facultyBackground from '@/assets/images/bg/bg_hero.webp'
import { Field, FieldGroup } from '@/components/ui/field'
import { useAppForm } from '@/hooks/form'
import { useMutation } from '@/hooks/useMutation'
import { loginFn } from '@/routes/_authed'

function getUserFriendlyError(message: string): string {
  const lowerMessage = message.toLowerCase()

  if (
    lowerMessage.includes('invalid credentials') ||
    lowerMessage.includes('wrong password') ||
    lowerMessage.includes('incorrect')
  ) {
    return 'Invalid email or password. Please check your credentials and try again.'
  }
  if (
    lowerMessage.includes('email not found') ||
    lowerMessage.includes('user not found')
  ) {
    return 'No account found with this email. Please sign up first.'
  }
  if (
    lowerMessage.includes('email not verified') ||
    lowerMessage.includes('not verified')
  ) {
    return 'Please verify your email before logging in. Check your inbox for the verification link.'
  }
  if (
    lowerMessage.includes('account locked') ||
    lowerMessage.includes('locked')
  ) {
    return 'Your account has been locked. Please contact support for assistance.'
  }
  if (lowerMessage.includes('network') || lowerMessage.includes('connection')) {
    return 'Network error. Please check your connection and try again.'
  }

  return 'Unable to sign in. Please try again later.'
}

interface LoginFormProps {
  verified?: boolean
}

export function LoginForm({ verified = false }: LoginFormProps) {
  const router = useRouter()

  const loginMutation = useMutation({
    fn: loginFn,
    onSuccess: async (ctx) => {
      if (!ctx.data?.error) {
        await router.invalidate()
        router.navigate({ to: '/dashboard' })
        return
      }
      if (ctx.data.message) {
        toast.error(getUserFriendlyError(ctx.data.message))
      }
    },
  })

  const form = useAppForm({
    defaultValues: { email: '', password: '' },
    onSubmit: async ({ value }) => {
      loginMutation.mutate({
        data: {
          email: value.email,
          password: value.password,
        },
      })
    },
  })

  return (
    <section
      className="relative isolate min-h-svh overflow-hidden border-b border-[#1A1A1A]/10 text-[#1C1815]"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0.9), rgba(255,255,255,0.9)), url(${facultyBackground})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(197,160,89,0.12),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.28),transparent_22%)]" />

      <div className="relative mx-auto max-w-[calc(100%-2rem)] px-5 py-18 sm:max-w-[calc(100%-4rem)] sm:px-6 sm:py-22 lg:max-w-[calc(100%-8rem)] lg:px-12 lg:py-24">
        <div className="grid items-start gap-14 lg:grid-cols-[minmax(0,0.82fr)_minmax(24rem,1.18fr)] lg:gap-20">
          <div className="flex h-full flex-1 flex-col justify-between space-y-10">
            <div className="space-y-6">
              <div className="inline-flex flex-col gap-2 text-[0.72rem] font-medium tracking-[0.3em] text-[#9B7A41] uppercase">
                <div className="h-px w-20 bg-[#9B7A41]/50 lg:w-28" />
                <div className="flex flex-row items-center gap-3">
                  <span className="h-px w-10 bg-[#9B7A41]/55" />
                  Login Portal
                </div>
              </div>

              <h1 className="max-w-[10ch] font-serif text-[clamp(3rem,5vw,5.1rem)] leading-[0.92] tracking-[-0.055em] text-[#1C1815]">
                Welcome back
              </h1>

              <p className="max-w-xl text-base leading-8 font-light tracking-[0.04em] text-[#4E463D] sm:text-lg">
                "Through desire a man, having separated himself, seeketh and
                intermeddleth with all wisdom."
                <br />
                <span className="text-[0.72rem] font-medium tracking-[0.2em] text-[#9B7A41] uppercase">
                  Proverbs 18:1
                </span>
              </p>
            </div>

            <div className="border-t border-[#1A1A1A]/10 pt-8 text-[0.65rem] font-medium tracking-[0.18em] text-[#8E816D] uppercase">
              <div>© {new Date().getFullYear()} DINA</div>
              <a
                href="https://cherubim-it.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block transition-colors hover:text-[#9B7A41]"
              >
                Cherubim IT
              </a>
            </div>
          </div>

          <div className="relative border border-white/10 bg-[#171717]/72 p-4 shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)] backdrop-blur-sm sm:p-6">
            <div
              className="relative overflow-hidden border border-white/10"
              style={{
                backgroundImage: `linear-gradient(180deg, rgba(7,7,8,0.26), rgba(7,7,8,0.72)), url(${facultyBackground})`,
                backgroundPosition: 'center',
                backgroundSize: 'cover',
              }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),transparent_38%,rgba(197,160,89,0.14)_100%)]" />
              <div className="relative flex min-h-72 flex-col justify-between p-6 sm:p-8 lg:min-h-84">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#E9D9B4] uppercase">
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

                <div className="max-w-68 border border-white/12 bg-black/24 px-4 py-4 shadow-[0_24px_40px_-30px_rgba(0,0,0,0.55)] backdrop-blur-sm">
                  <div className="text-[0.62rem] font-medium tracking-[0.28em] text-[#AFA28F] uppercase">
                    Theme
                  </div>
                  <div className="mt-2 font-serif text-xl leading-tight text-[#F8F4EC]">
                    Learn Christ, not Theology
                  </div>
                </div>
              </div>
            </div>

            <div className="gap-5 border-x border-b border-white/10 bg-[#151515]/88 px-6 py-7 sm:px-8 sm:py-8">
              {verified && (
                <div className="mb-6 border border-green-500/30 bg-green-50 px-4 py-3 text-sm text-green-800">
                  Email verified. You may now sign in.
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  void form.handleSubmit()
                }}
              >
                <div className="min-h-76 border border-white/10 bg-white/3 p-5 shadow-[0_22px_36px_-30px_rgba(0,0,0,0.4)]">
                  <FieldGroup>
                    <form.AppField name="email">
                      {(field) => (
                        <field.TextField
                          id="email-v2"
                          label="Email"
                          type="email"
                          placeholder="your@email.com"
                          required
                        />
                      )}
                    </form.AppField>

                    <form.AppField name="password">
                      {(field) => (
                        <field.TextField
                          id="password-v2"
                          label="Password"
                          type="password"
                          required
                        />
                      )}
                    </form.AppField>

                    <div className="flex w-full items-center justify-end">
                      <Link
                        to="/forgot-password"
                        className="text-[0.72rem] text-[#9B7A41] underline-offset-4 transition-colors hover:underline"
                      >
                        Forgot your password?
                      </Link>
                    </div>

                    <Field className="pt-2">
                      <button
                        type="submit"
                        disabled={
                          loginMutation.isPending ||
                          (loginMutation.data !== undefined &&
                            !loginMutation.data.error)
                        }
                        className="group inline-flex h-11 cursor-pointer items-center justify-center gap-3 border border-[#C5A059]/55 bg-linear-to-b from-[#2A2A2A] to-[#111111] px-8 font-serif text-base tracking-[0.12em] text-[#E9D9B4] shadow-[0_28px_60px_-28px_rgba(0,0,0,0.7)] transition-all hover:-translate-y-0.5 hover:border-[#D6B16E] hover:text-white disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:border-[#C5A059]/55 disabled:hover:text-[#E9D9B4]"
                      >
                        {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
                      </button>
                    </Field>
                  </FieldGroup>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify**

```bash
bun lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
gt c -m "refactor(login-form): migrate to useAppForm"
```

---

## Task 3: Migrate SignupForm

**Files:**
- Modify: `src/components/auth/signup-form.tsx`

The signup form keeps `invitationValid`, `invitationError`, `invitationRole`, `isLoadingToken`, `isCheckingEmail`, `showOtpInput`, `otpValue`, and `resendCooldown` as external `useState`. The `email` and `password` `useState` are removed — those values are read from `form.state.values`. The OTP step JSX is unchanged. The hidden token `<input>` is removed since `token` is passed directly in `onSubmit`.

- [ ] **Step 1: Replace the form implementation**

Replace the entire content of `src/components/auth/signup-form.tsx` with:

```typescript
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
import { useAppForm } from '@/hooks/form'
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
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [invitationValid, setInvitationValid] = useState(false)
  const [invitationError, setInvitationError] = useState<string | null>(null)
  const [invitationRole, setInvitationRole] = useState<string | null>(null)
  const [isLoadingToken, setIsLoadingToken] = useState(!!token)

  const [showOtpInput, setShowOtpInput] = useState(false)
  const [otpValue, setOtpValue] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  const form = useAppForm({
    defaultValues: {
      email: '',
      name: '',
      password: '',
      confirmPassword: '',
    },
    onSubmit: async ({ value }) => {
      if (!invitationValid) {
        setInvitationError('Please enter a valid email with an invitation')
        return
      }
      signupMutation.mutate({
        data: {
          email: value.email,
          password: value.password,
          fullName: value.name || undefined,
          token,
        },
      })
    },
  })

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

  const passwordStrength = calculatePasswordStrength(
    form.state.values.password || '',
  )

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

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  useEffect(() => {
    if (token) {
      setIsLoadingToken(true)
      getTokenFn({ data: { token } })
        .then((result) => {
          form.setFieldValue('email', result.invitation.email)
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
    const emailValue = form.state.values.email
    if (!emailValue || emailValue.length < 3) return

    setIsCheckingEmail(true)
    setInvitationError(null)

    try {
      const result = await checkEmailFn({ data: { email: emailValue } })
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

  const handleOtpComplete = (value: string) => {
    setOtpValue(value)
    if (value.length === 6) {
      verifyOtpMutation.mutate({
        data: {
          email: form.state.values.email,
          password: form.state.values.password,
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
        email: form.state.values.email,
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
            <span className="text-[#E9D9B4]">{form.state.values.email}</span>
          </p>
        </div>

        <InputOTP
          maxLength={6}
          id="otp-verification"
          value={otpValue}
          onChange={handleOtpComplete}
          disabled={verifyOtpMutation.isPending}
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

        {verifyOtpMutation.isPending && (
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
          disabled={resendCooldown > 0 || resendOtpMutation.isPending}
          className="mt-4 inline-flex cursor-pointer items-center gap-2 text-[0.68rem] font-medium tracking-[0.14em] text-[#9B8A73] uppercase transition-colors hover:text-[#C5A059] disabled:opacity-40"
        >
          <RefreshCwIcon className="h-3 w-3" />
          {resendCooldown > 0
            ? `Resend (${resendCooldown}s)`
            : resendOtpMutation.isPending
              ? 'Sending...'
              : 'Resend Code'}
        </button>
      </Field>,
    )
  }

  return pageShell(
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <FieldGroup>
        <form.Field name="email">
          {(field) => (
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
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
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
                <FieldDescription theme="dark">
                  Checking email...
                </FieldDescription>
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
          )}
        </form.Field>

        <form.AppField name="name">
          {(field) => (
            <field.TextField
              id="name"
              label="Full Name"
              type="text"
              placeholder="John Doe"
              required
            />
          )}
        </form.AppField>

        <form.Field name="password">
          {(field) => (
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
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              {field.state.value && (
                <div className="mt-2">
                  <div className="mb-1 flex items-center gap-3">
                    <div className="h-1 flex-1 overflow-hidden bg-white/10">
                      <div
                        className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{
                          width: `${(passwordStrength.score / 4) * 100}%`,
                        }}
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
          )}
        </form.Field>

        <form.Field
          name="confirmPassword"
          validators={{
            onChangeListenTo: ['password'],
            onChange: ({ value, fieldApi }) =>
              value !== fieldApi.form.getFieldValue('password')
                ? 'Passwords do not match'
                : undefined,
          }}
        >
          {(field) => (
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
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              {field.state.meta.errors.length > 0 &&
                field.state.meta.isTouched && (
                  <FieldDescription className="text-destructive">
                    {String(field.state.meta.errors[0])}
                  </FieldDescription>
                )}
            </Field>
          )}
        </form.Field>

        <Field className="pt-2">
          <button
            type="submit"
            disabled={
              signupMutation.isPending ||
              !invitationValid ||
              (signupMutation.data !== undefined && !signupMutation.data.error)
            }
            className="group inline-flex h-11 items-center justify-center gap-3 border border-[#C5A059]/55 bg-linear-to-b from-[#2A2A2A] to-[#111111] px-8 font-serif text-base tracking-[0.12em] text-[#E9D9B4] shadow-[0_28px_60px_-28px_rgba(0,0,0,0.7)] transition-all hover:-translate-y-0.5 hover:border-[#D6B16E] hover:text-white disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:border-[#C5A059]/55 disabled:hover:text-[#E9D9B4]"
          >
            {signupMutation.isPending
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
```

- [ ] **Step 2: Verify**

```bash
bun lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
gt c -m "refactor(signup-form): migrate to useAppForm"
```

---

## Task 4: Migrate EnrolmentForm

**Files:**
- Modify: `src/components/auth/enrolment-form.tsx`

The enrolment form already uses `useForm` from `@tanstack/react-form`. This task replaces it with `useAppForm`, converts simple `form.Field` → `form.AppField` for text/select fields, removes the `attemptedFields` state + `StableFieldError` + `getFieldError` + `getManualError` + `getVisibleError` + `FIELD_VALIDATORS`, and replaces the step validator with an async one using `form.validateField`.

- [ ] **Step 1: Replace the form implementation**

Replace the entire content of `src/components/auth/enrolment-form.tsx` with:

```typescript
import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { useServerFn } from '@tanstack/react-start'
import houseFoundation from '@/assets/images/house/house_foundation.webp'
import houseGround from '@/assets/images/house/house_ground.webp'
import houseFraming from '@/assets/images/house/house_framing.webp'
import houseWalls from '@/assets/images/house/house_walls.webp'
import houseInterior from '@/assets/images/house/house_interior.webp'
import houseRoof from '@/assets/images/house/house_roof.webp'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { SelectItem } from '@/components/ui/select'
import { useAppForm } from '@/hooks/form'
import { createEnrollment } from '@/utils/enrolment/enrollments'

function required({ value }: { value: string }) {
  return !value.trim() ? 'This field is required' : undefined
}

function validEmail({ value }: { value: string }) {
  if (!value.trim()) return 'Email is required'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    return 'Enter a valid email address'
  return undefined
}

function countWords(value: string): number {
  const trimmed = value.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).filter(Boolean).length
}

function maxWords(max: number) {
  return ({ value }: { value: string }) =>
    countWords(value) > max ? `Must be ${max} words or fewer` : undefined
}

function validYear({ value }: { value: string }) {
  const trimmed = value.trim()
  if (!trimmed) return 'Year of birth is required'
  const year = Number(trimmed)
  if (!Number.isInteger(year)) return 'Year of birth must be a whole number'
  const current = new Date().getFullYear()
  if (year < 1900) return 'Year of birth must be reasonable'
  if (year > current) return 'Year of birth cannot be in the future'
  return undefined
}

function requiredSelect({ value }: { value: string }) {
  return !value ? 'This field is required' : undefined
}

function optionalText(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

const ENROLMENT_DEFAULT_VALUES = {
  fullLegalName: '',
  preferredName: '',
  email: '',
  yearOfBirth: '',
  gender: '',
  nationalityCitizenship: '',
  phoneWhatsApp: '',
  currentCity: '',
  currentCountry: '',
  churchAffiliations: '',
  aboutYourself: '',
  expectationsAlignment: '',
}

const STEPS = [
  {
    id: 'identity',
    title: 'Your Identity',
    image: houseGround,
    fields: ['fullLegalName', 'preferredName', 'email'],
  },
  {
    id: 'contact',
    title: 'Contact Details',
    image: houseFoundation,
    fields: ['phoneWhatsApp', 'yearOfBirth', 'gender'],
  },
  {
    id: 'location',
    title: 'Location',
    image: houseWalls,
    fields: ['nationalityCitizenship', 'currentCity', 'currentCountry'],
  },
  {
    id: 'church',
    title: 'Church Context',
    image: houseFraming,
    fields: ['churchAffiliations'],
  },
  {
    id: 'story',
    title: 'Your Story',
    image: houseInterior,
    fields: ['aboutYourself'],
  },
  {
    id: 'roof',
    title: 'Your Roof',
    image: houseRoof,
    fields: ['expectationsAlignment'],
  },
] as const

type EnrolmentFieldName = (typeof STEPS)[number]['fields'][number]

export function EnrolmentForm() {
  const [submitted, setSubmitted] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  const createEnrollmentFn = useServerFn(createEnrollment)

  const form = useAppForm({
    defaultValues: ENROLMENT_DEFAULT_VALUES,
    onSubmit: async ({ value }) => {
      try {
        await createEnrollmentFn({
          data: {
            fullLegalName: value.fullLegalName,
            preferredName: optionalText(value.preferredName),
            email: value.email,
            yearOfBirth: value.yearOfBirth,
            gender: value.gender as 'male' | 'female',
            nationalityCitizenship: optionalText(value.nationalityCitizenship),
            phoneWhatsApp: value.phoneWhatsApp,
            currentCity: optionalText(value.currentCity),
            currentCountry: optionalText(value.currentCountry),
            churchAffiliations: optionalText(value.churchAffiliations),
            aboutYourself: value.aboutYourself,
            expectationsAlignment: value.expectationsAlignment,
          },
        })

        setSubmitted(true)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Submission failed'
        toast.error(message)
      }
    },
  })

  const currentStepConfig = STEPS[currentStep]

  const validateCurrentStep = async (): Promise<boolean> => {
    await Promise.all(
      currentStepConfig.fields.map((fieldName) =>
        form.validateField(fieldName, 'change'),
      ),
    )
    const hasErrors = currentStepConfig.fields.some(
      (fieldName) =>
        (form.state.fieldMeta[fieldName]?.errors ?? []).length > 0,
    )
    if (hasErrors) {
      toast.error('Please complete this step before continuing.')
      return false
    }
    return true
  }

  const handleNext = async () => {
    if (!(await validateCurrentStep())) return

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      void form.handleSubmit()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        void handleNext()
      } else if (e.key === 'ArrowRight') {
        void handleNext()
      } else if (e.key === 'ArrowLeft' && currentStep > 0) {
        handleBack()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentStep, handleNext, handleBack])

  const pageShell = (rightPanel: React.ReactNode) => (
    <section className="relative isolate min-h-svh overflow-hidden bg-[#111111] text-[#F8F4EC]">
      <div className="grid min-h-svh lg:grid-cols-2">
        <aside className="relative hidden min-h-svh overflow-hidden lg:block">
          <img
            key={currentStepConfig.id}
            src={currentStepConfig.image}
            alt=""
            className="animate-in fade-in h-full w-full object-cover duration-500"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.28),rgba(0,0,0,0.62)),linear-gradient(180deg,rgba(0,0,0,0.12),rgba(0,0,0,0.68))]" />
          <div className="absolute inset-x-0 bottom-0 p-10 xl:p-14">
            <div className="max-w-md border border-white/12 bg-black/28 p-6 backdrop-blur-sm">
              <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#D4B373] uppercase">
                Enrolment 2026
              </div>
              <h1 className="mt-4 font-serif text-[clamp(3rem,5vw,5.5rem)] leading-[0.9] tracking-[-0.055em] text-white">
                Apply for enrolment
              </h1>
              <p className="mt-5 text-sm leading-7 tracking-[0.04em] text-[#E6DDCF]">
                "Through desire a man, having separated himself, seeketh and
                intermeddleth with all wisdom."
              </p>
            </div>
          </div>
        </aside>

        <div className="relative flex min-h-svh flex-col items-center justify-center bg-[#151515] px-5 pt-24 pb-10 sm:px-8 lg:px-12 lg:pt-20">
          <div className="p-6 text-center lg:hidden">
            <h1 className="mt-4 font-serif text-[clamp(3rem,5vw,5.5rem)] leading-[0.9] tracking-[-0.055em] text-white">
              Apply for enrolment
            </h1>
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(197,160,89,0.14),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.06),transparent_24%)]" />
          <div className="relative w-full max-w-xl">{rightPanel}</div>
        </div>
      </div>
    </section>
  )

  if (submitted) {
    return pageShell(
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 shrink-0 text-[#6FCF97]" />
          <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#6FCF97] uppercase">
            Application submitted
          </div>
        </div>
        <p className="text-sm leading-7 text-[#D6CCBE]">
          Thank you for applying. We will review your application and be in
          touch.
        </p>
        <div className="h-px w-full bg-white/10" />
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[0.68rem] font-medium tracking-[0.14em] text-[#9B8A73] uppercase transition-colors hover:text-[#C5A059]"
        >
          ← Back to home
        </Link>
      </div>,
    )
  }

  const renderField = (fieldName: EnrolmentFieldName) => {
    switch (fieldName) {
      case 'fullLegalName':
        return (
          <form.AppField
            name="fullLegalName"
            validators={{ onChange: required }}
          >
            {(field) => (
              <field.TextField
                id="enrol-full-legal-name"
                label="Full legal name"
                type="text"
                placeholder="John Doe"
                required
              />
            )}
          </form.AppField>
        )
      case 'preferredName':
        return (
          <form.AppField name="preferredName">
            {(field) => (
              <field.TextField
                id="enrol-preferred-name"
                label="Preferred name"
                type="text"
                placeholder="John"
              />
            )}
          </form.AppField>
        )
      case 'email':
        return (
          <form.AppField name="email" validators={{ onChange: validEmail }}>
            {(field) => (
              <field.TextField
                id="enrol-email"
                label="Email"
                type="email"
                placeholder="your@email.com"
                required
              />
            )}
          </form.AppField>
        )
      case 'phoneWhatsApp':
        return (
          <form.AppField
            name="phoneWhatsApp"
            validators={{ onChange: required }}
          >
            {(field) => (
              <field.TextField
                id="enrol-phone"
                label="Phone number (WhatsApp)"
                type="tel"
                placeholder="+358 40 123 4567"
                required
              />
            )}
          </form.AppField>
        )
      case 'yearOfBirth':
        return (
          <form.AppField name="yearOfBirth" validators={{ onChange: validYear }}>
            {(field) => (
              <field.TextField
                id="enrol-yob"
                label="Year of birth"
                type="number"
                placeholder="1996"
                required
              />
            )}
          </form.AppField>
        )
      case 'gender':
        return (
          <form.AppField
            name="gender"
            validators={{ onChange: requiredSelect }}
          >
            {(field) => (
              <field.SelectField
                id="enrol-gender"
                label="Gender"
                placeholder="Select"
                required
              >
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </field.SelectField>
            )}
          </form.AppField>
        )
      case 'nationalityCitizenship':
        return (
          <form.AppField name="nationalityCitizenship">
            {(field) => (
              <field.TextField
                id="enrol-nationality"
                label="Nationality / citizenship"
                type="text"
                placeholder="Finnish"
              />
            )}
          </form.AppField>
        )
      case 'currentCity':
        return (
          <form.AppField name="currentCity">
            {(field) => (
              <field.TextField
                id="enrol-city"
                label="Current city"
                type="text"
                placeholder="Helsinki"
              />
            )}
          </form.AppField>
        )
      case 'currentCountry':
        return (
          <form.AppField name="currentCountry">
            {(field) => (
              <field.TextField
                id="enrol-country"
                label="Current country"
                type="text"
                placeholder="Finland"
              />
            )}
          </form.AppField>
        )
      case 'churchAffiliations':
        return (
          <form.AppField name="churchAffiliations">
            {(field) => (
              <field.TextField
                id="enrol-church"
                label="Church affiliations"
                type="text"
                placeholder="Church name, network, etc."
              />
            )}
          </form.AppField>
        )
      case 'aboutYourself':
        return (
          <form.Field
            name="aboutYourself"
            validators={{ onChange: (v) => required(v) || maxWords(200)(v) }}
          >
            {(field) => {
              const error = field.state.meta.errors[0]
                ? String(field.state.meta.errors[0])
                : undefined
              return (
                <Field>
                  <FieldLabel
                    className="normal-case"
                    htmlFor="enrol-about"
                    theme="dark"
                  >
                    Tell us about yourself and why you are interested in this
                    program
                  </FieldLabel>
                  <textarea
                    id="enrol-about"
                    name="aboutYourself"
                    placeholder="Write up to 200 words..."
                    rows={6}
                    required
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    className="w-full resize-none border border-white/12 bg-[#1A1A1A] px-3 py-2.5 text-sm leading-7 text-[#F8F4EC] placeholder:text-[#5A5248] focus:border-[#C5A059]/50 focus:ring-1 focus:ring-[#C5A059]/30 focus:outline-none"
                  />
                  <div className="flex items-start justify-between gap-4">
                    {error ? (
                      <FieldDescription
                        theme="dark"
                        className="text-destructive"
                      >
                        {error}
                      </FieldDescription>
                    ) : (
                      <FieldDescription theme="dark">
                        Maximum 200 words.
                      </FieldDescription>
                    )}
                    <span className="shrink-0 text-[0.62rem] text-[#5A5248]">
                      {countWords(field.state.value)} words
                    </span>
                  </div>
                </Field>
              )
            }}
          </form.Field>
        )
      case 'expectationsAlignment':
        return (
          <form.Field
            name="expectationsAlignment"
            validators={{ onChange: (v) => required(v) || maxWords(200)(v) }}
          >
            {(field) => {
              const error = field.state.meta.errors[0]
                ? String(field.state.meta.errors[0])
                : undefined
              return (
                <Field>
                  <FieldLabel
                    className="normal-case"
                    htmlFor="enrol-expectations"
                    theme="dark"
                  >
                    Tell us what you expect to achieve at the end of this
                    program, and how it would align with your personal pursuit
                    of Jesus Christ.
                  </FieldLabel>
                  <textarea
                    id="enrol-expectations"
                    name="expectationsAlignment"
                    placeholder="Write up to 200 words..."
                    rows={6}
                    required
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    className="w-full resize-none border border-white/12 bg-[#1A1A1A] px-3 py-2.5 text-sm leading-7 text-[#F8F4EC] placeholder:text-[#5A5248] focus:border-[#C5A059]/50 focus:ring-1 focus:ring-[#C5A059]/30 focus:outline-none"
                  />
                  <div className="flex items-start justify-between gap-4">
                    {error ? (
                      <FieldDescription
                        theme="dark"
                        className="text-destructive"
                      >
                        {error}
                      </FieldDescription>
                    ) : (
                      <FieldDescription theme="dark">
                        Maximum 200 words.
                      </FieldDescription>
                    )}
                    <span className="shrink-0 text-[0.62rem] text-[#5A5248]">
                      {countWords(field.state.value)} words
                    </span>
                  </div>
                </Field>
              )
            }}
          </form.Field>
        )
      default:
        return null
    }
  }

  return pageShell(
    <form
      className="flex min-h-136 flex-col border border-white/10 bg-[#171717]/88 p-5 shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)] backdrop-blur-sm sm:min-h-144 sm:p-8"
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        void (async () => {
          if (await validateCurrentStep()) void form.handleSubmit()
        })()
      }}
    >
      <div className="flex flex-1 flex-col">
        <div className="mb-8 flex items-start gap-4 lg:block">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden border border-white/10 lg:hidden">
            <img
              key={currentStepConfig.id}
              src={currentStepConfig.image}
              alt=""
              className="animate-in fade-in h-full w-full object-cover duration-1500"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/44 to-transparent" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#D4B373] uppercase">
                Step {currentStep + 1} of {STEPS.length}
              </div>
              <div className="grid w-full grid-cols-6 gap-1 sm:flex sm:w-auto">
                {STEPS.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1 min-w-0 transition-colors duration-300 sm:w-8 ${
                      index <= currentStep ? 'bg-[#C5A059]' : 'bg-white/20'
                    }`}
                  />
                ))}
              </div>
            </div>
            <h2
              key={currentStep}
              className="animate-in fade-in slide-in-from-right-8 font-serif text-2xl leading-tight text-[#F8F4EC] duration-500"
            >
              {currentStepConfig.title}
            </h2>
          </div>
        </div>

        <FieldGroup className="flex-1">
          <div
            key={currentStep}
            className="animate-in fade-in slide-in-from-right-4 space-y-8 duration-500"
          >
            {currentStepConfig.fields.map(renderField)}
          </div>
        </FieldGroup>

        <div className="mt-auto pt-8">
          <FieldDescription theme="dark" className="mb-4 text-center">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-[#C5A059] underline-offset-4 transition-colors hover:underline"
            >
              Sign in
            </Link>
          </FieldDescription>

          <div className="flex items-center justify-between gap-4">
            {currentStep > 0 ? (
              <Button
                type="button"
                variant="ghost"
                theme="lightGhost"
                size="sm"
                onClick={handleBack}
                className="h-auto px-0 text-[0.68rem] tracking-[0.14em] text-[#9B8A73] uppercase shadow-none hover:bg-transparent hover:text-[#C5A059]"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            ) : (
              <div />
            )}
            <Button
              type="button"
              theme="dark"
              size="lg"
              onClick={() => void handleNext()}
              className="h-11 px-6"
            >
              {currentStep === STEPS.length - 1 ? 'Submit' : 'Next'}
              {currentStep < STEPS.length - 1 && (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </form>,
  )
}
```

- [ ] **Step 2: Verify**

```bash
bun lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
gt c -m "refactor(enrolment-form): migrate to useAppForm with form.AppField for simple fields"
```
