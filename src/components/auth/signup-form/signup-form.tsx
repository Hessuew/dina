import { useEffect, useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Loader2, RefreshCwIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { EmailFieldState } from '@/components/auth/signup-form/signup-form.domain'
import type { PasswordStrength } from '@/utils/password'
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
import { useAppForm, withForm } from '@/hooks/form'
import { useMutation } from '@/hooks/useMutation'
import { resendOtpFn, signupFn, verifyOtpFn } from '@/utils/signup'
import { signupSchema } from '@/schemas/auth.schema'
import {
  checkInvitationByEmail,
  getInvitationByToken,
} from '@/utils/invitation'
import { calculatePasswordStrength } from '@/utils/password'
import graphiteBackground from '@/assets/images/bg/bg_about.webp'
import {
  AuthFeaturePanel,
  AuthFormSurface,
  AuthPageShell,
} from '@/components/auth/auth-layout'
import {
  buildEmailFieldView,
  isOtpComplete,
  isResendDisabled,
  isSignupSubmitDisabled,
  resolveResendLabel,
  resolveResendOutcome,
  resolveSignupOutcome,
  resolveVerifyOutcome,
} from '@/components/auth/signup-form/signup-form.domain'

interface SignupFormProps {
  token?: string
}

const SIGNUP_DEFAULT_VALUES = {
  email: '',
  name: '',
  password: '',
  confirmPassword: '',
}

interface InvitationSetters {
  setIsCheckingEmail: (value: boolean) => void
  setIsLoadingToken: (value: boolean) => void
  setInvitationValid: (value: boolean) => void
  setInvitationRole: (value: string | null) => void
  setInvitationError: (value: string | null) => void
}

function useResendCooldown(): [number, (value: number) => void] {
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  return [resendCooldown, setResendCooldown]
}

function useSignupSubmit({
  token,
  invitationValid,
  setInvitationError,
  onOtpRequired,
}: {
  token: string
  invitationValid: boolean
  setInvitationError: (value: string | null) => void
  onOtpRequired: () => void
}) {
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
      const outcome = resolveSignupOutcome(ctx.data)
      if (outcome.kind === 'error') {
        toast.error(outcome.message)
      } else if (outcome.kind === 'otp-required') {
        onOtpRequired()
        toast.success('Verification code sent', {
          description: outcome.description,
          duration: 6000,
        })
      }
    },
  })

  const form = useAppForm({
    defaultValues: SIGNUP_DEFAULT_VALUES,
    onSubmit: ({ value }) => {
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

  return { form, signupMutation }
}

function useSignupInvitation({
  token,
  setEmail,
  getEmail,
  setters,
}: {
  token: string
  setEmail: (email: string) => void
  getEmail: () => string
  setters: InvitationSetters
}) {
  const checkEmailFn = useServerFn(checkInvitationByEmail)
  const getTokenFn = useServerFn(getInvitationByToken)

  useEffect(() => {
    if (!token) return
    setters.setIsLoadingToken(true)
    getTokenFn({ data: { token } })
      .then((result) => {
        setEmail(result.invitation.email)
        setters.setInvitationValid(true)
        setters.setInvitationRole(result.invitation.role)
      })
      .catch((error) => {
        const userError = toUserError(error)
        setters.setInvitationError(userError.message)
        toast.error('Invalid invitation', { description: userError.message })
      })
      .finally(() => {
        setters.setIsLoadingToken(false)
      })
  }, [token, getTokenFn])

  const handleEmailBlur = async () => {
    const emailValue = getEmail()
    if (!emailValue || emailValue.length < 3) return

    setters.setIsCheckingEmail(true)
    setters.setInvitationError(null)

    try {
      const result = await checkEmailFn({ data: { email: emailValue } })
      setters.setInvitationValid(true)
      setters.setInvitationRole(result.invitation.role)
      setters.setInvitationError(null)
    } catch (error) {
      const userError = toUserError(error)
      setters.setInvitationError(userError.message)
      setters.setInvitationValid(false)
      toast.error('Email not invited', { description: userError.message })
    } finally {
      setters.setIsCheckingEmail(false)
    }
  }

  return { handleEmailBlur }
}

function useOtpVerification({
  token,
  getCredentials,
}: {
  token: string
  getCredentials: () => { email: string; password: string; fullName?: string }
}) {
  const router = useRouter()
  const [otpValue, setOtpValue] = useState('')

  const verifyOtpMutation = useMutation<
    {
      data: {
        email: string
        password: string
        fullName?: string
        otp: string
        invitationToken: string
      }
    },
    { success: boolean; loginFailed?: boolean; message: string }
  >({
    fn: useServerFn(verifyOtpFn),
    onSuccess: async (ctx) => {
      const outcome = resolveVerifyOutcome(ctx.data)
      if (outcome.kind === 'error') {
        toast.error(outcome.message)
        return
      }
      if (outcome.kind === 'verified-login') {
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
    },
  })

  const handleOtpComplete = (value: string) => {
    setOtpValue(value)
    if (isOtpComplete(value)) {
      const { email, password, fullName } = getCredentials()
      verifyOtpMutation.mutate({
        data: { email, password, fullName, otp: value, invitationToken: token },
      })
    }
  }

  return {
    otpValue,
    handleOtpComplete,
    isVerifying: verifyOtpMutation.isPending,
  }
}

function useOtpResend({
  token,
  getEmail,
  resendCooldown,
  onSent,
}: {
  token: string
  getEmail: () => string
  resendCooldown: number
  onSent: () => void
}) {
  const resendOtpMutation = useMutation<
    { data: { email: string; invitationToken: string } },
    { success: boolean; message: string }
  >({
    fn: useServerFn(resendOtpFn),
    onSuccess: (ctx) => {
      const outcome = resolveResendOutcome(ctx.data)
      if (outcome.kind === 'sent') {
        toast.success(outcome.message)
        onSent()
      } else {
        toast.error(outcome.message)
      }
    },
  })

  const handleResendOtp = () => {
    if (resendCooldown > 0) return
    resendOtpMutation.mutate({
      data: { email: getEmail(), invitationToken: token },
    })
  }

  return { handleResendOtp, isResending: resendOtpMutation.isPending }
}

function useInvitationState(token: string) {
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [invitationValid, setInvitationValid] = useState(false)
  const [invitationError, setInvitationError] = useState<string | null>(null)
  const [invitationRole, setInvitationRole] = useState<string | null>(null)
  const [isLoadingToken, setIsLoadingToken] = useState(!!token)

  const emailState: EmailFieldState = {
    isCheckingEmail,
    isLoadingToken,
    invitationError,
    invitationValid,
    invitationRole,
  }
  const setters: InvitationSetters = {
    setIsCheckingEmail,
    setIsLoadingToken,
    setInvitationValid,
    setInvitationRole,
    setInvitationError,
  }

  return { emailState, setters }
}

function useSignupForm(token: string) {
  const { emailState, setters } = useInvitationState(token)
  const [showOtpInput, setShowOtpInput] = useState(false)
  const [resendCooldown, setResendCooldown] = useResendCooldown()

  const { form, signupMutation } = useSignupSubmit({
    token,
    invitationValid: emailState.invitationValid,
    setInvitationError: setters.setInvitationError,
    onOtpRequired: () => {
      setShowOtpInput(true)
      setResendCooldown(60)
    },
  })

  const { handleEmailBlur } = useSignupInvitation({
    token,
    setEmail: (email) => form.setFieldValue('email', email),
    getEmail: () => form.state.values.email,
    setters,
  })

  const otp = useOtpVerification({
    token,
    getCredentials: () => ({
      email: form.state.values.email,
      password: form.state.values.password,
      fullName: form.state.values.name || undefined,
    }),
  })

  const resend = useOtpResend({
    token,
    getEmail: () => form.state.values.email,
    resendCooldown,
    onSent: () => setResendCooldown(60),
  })

  return {
    form,
    showOtpInput,
    emailState,
    handleEmailBlur,
    signupMutation,
    otp,
    resend: { resendCooldown, ...resend },
  }
}

function SignupPageFrame({
  showOtpInput,
  children,
}: {
  showOtpInput: boolean
  children: React.ReactNode
}) {
  return (
    <AuthPageShell
      backgroundImage={graphiteBackground}
      tone="dark"
      eyebrow="Signup Portal"
      title={showOtpInput ? 'Verify your email' : 'Create account'}
      quote={
        <>
          "Through desire a man, having separated himself, seeketh and
          intermeddleth with all wisdom."
        </>
      }
      scripture="Proverbs 18:1"
      columnClassName="lg:grid-cols-[minmax(0,0.85fr)_minmax(24rem,1.15fr)]"
      containerClassName="sm:px-8"
      titleClassName="max-w-[12ch] text-[clamp(3rem,5vw,5.2rem)]"
    >
      <AuthFeaturePanel
        backgroundImage={graphiteBackground}
        minHeightClassName="min-h-48"
        brandLabelClassName="text-[#D4B373]"
      >
        <AuthFormSurface className="min-h-0">{children}</AuthFormSurface>
      </AuthFeaturePanel>
    </AuthPageShell>
  )
}

type SignupCredentialsFormProps = {
  emailState: EmailFieldState
  onEmailBlur: () => void
  invitationValid: boolean
  isPending: boolean
  submitDisabled: boolean
}

const SignupAccountFields = withForm({
  defaultValues: SIGNUP_DEFAULT_VALUES,
  props: {} as {
    emailState: EmailFieldState
    onEmailBlur: () => void
  },
  render: ({ form, emailState, onEmailBlur }) => (
    <>
      <form.Field name="email">
        {(field) => (
          <SignupEmailField
            value={field.state.value}
            onChange={(value) => field.handleChange(value)}
            onBlur={onEmailBlur}
            state={emailState}
          />
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
    </>
  ),
})

const SignupSecurityFields = withForm({
  defaultValues: SIGNUP_DEFAULT_VALUES,
  props: {} as {
    invitationValid: boolean
  },
  render: ({ form, invitationValid }) => (
    <>
      <form.Field
        name="password"
        validators={{ onSubmit: signupSchema.shape.password }}
      >
        {(field) => (
          <SignupPasswordField
            value={field.state.value}
            onChange={(value) => field.handleChange(value)}
            errors={field.state.meta.errors}
            disabled={!invitationValid}
          />
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
          <SignupConfirmPasswordField
            value={field.state.value}
            onChange={(value) => field.handleChange(value)}
            errors={field.state.meta.errors}
            isTouched={field.state.meta.isTouched}
            disabled={!invitationValid}
          />
        )}
      </form.Field>
    </>
  ),
})

const EMAIL_DESCRIPTION_PROPS = {
  muted: { theme: 'dark' as const },
  error: { className: 'text-destructive' },
  success: { className: 'text-[#6FCF97]' },
}

function SignupEmailField({
  value,
  onChange,
  onBlur,
  state,
}: {
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  state: EmailFieldState
}) {
  const view = buildEmailFieldView(state)
  return (
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
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          required
          theme="dark"
          disabled={view.inputDisabled}
        />
        {view.spinnerVisible && (
          <div className="absolute top-1/2 right-3 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-[#9B8A73]" />
          </div>
        )}
      </div>
      {view.descriptions.map((item) => (
        <FieldDescription
          key={item.key}
          {...EMAIL_DESCRIPTION_PROPS[item.variant]}
        >
          {item.text}
        </FieldDescription>
      ))}
    </Field>
  )
}

function SignupPasswordField({
  value,
  onChange,
  errors,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  errors: ReadonlyArray<unknown>
  disabled: boolean
}) {
  const passwordStrength = calculatePasswordStrength(value)
  return (
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
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {errors.length > 0 && (
        <FieldDescription className="text-destructive">
          {String(errors[0])}
        </FieldDescription>
      )}
      {value && <PasswordStrengthMeter passwordStrength={passwordStrength} />}
    </Field>
  )
}

function PasswordStrengthMeter({
  passwordStrength,
}: {
  passwordStrength: PasswordStrength
}) {
  return (
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
  )
}

function SignupConfirmPasswordField({
  value,
  onChange,
  errors,
  isTouched,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  errors: ReadonlyArray<unknown>
  isTouched: boolean
  disabled: boolean
}) {
  return (
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
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {errors.length > 0 && isTouched && (
        <FieldDescription className="text-destructive">
          {String(errors[0])}
        </FieldDescription>
      )}
    </Field>
  )
}

function SignupSubmitSection({
  isPending,
  disabled,
}: {
  isPending: boolean
  disabled: boolean
}) {
  return (
    <Field className="pt-2">
      <button
        type="submit"
        disabled={disabled}
        className="group inline-flex h-11 items-center justify-center gap-3 border border-[#C5A059]/55 bg-linear-to-b from-[#2A2A2A] to-[#111111] px-8 font-serif text-base tracking-[0.12em] text-[#E9D9B4] shadow-[0_28px_60px_-28px_rgba(0,0,0,0.7)] transition-all hover:-translate-y-0.5 hover:border-[#D6B16E] hover:text-white disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:border-[#C5A059]/55 disabled:hover:text-[#E9D9B4]"
      >
        {isPending ? 'Creating Account...' : 'Create Account'}
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
  )
}

function OtpPanelHeader({ email }: { email: string }) {
  return (
    <div className="mb-5 space-y-1">
      <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
        Verification code
      </div>
      <p className="text-sm leading-6 text-[#D6CCBE]">
        Enter the code sent to <span className="text-[#E9D9B4]">{email}</span>
      </p>
    </div>
  )
}

function OtpCodeInput({
  otpValue,
  onOtpChange,
  isVerifying,
}: {
  otpValue: string
  onOtpChange: (value: string) => void
  isVerifying: boolean
}) {
  return (
    <InputOTP
      maxLength={6}
      id="otp-verification"
      value={otpValue}
      onChange={onOtpChange}
      disabled={isVerifying}
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
  )
}

function OtpResendButton({
  resendCooldown,
  onResend,
  isResending,
}: {
  resendCooldown: number
  onResend: () => void
  isResending: boolean
}) {
  return (
    <button
      type="button"
      onClick={onResend}
      disabled={isResendDisabled(resendCooldown, isResending)}
      className="mt-4 inline-flex cursor-pointer items-center gap-2 text-[0.68rem] font-medium tracking-[0.14em] text-[#9B8A73] uppercase transition-colors hover:text-[#C5A059] disabled:opacity-40"
    >
      <RefreshCwIcon className="h-3 w-3" />
      {resolveResendLabel(resendCooldown, isResending)}
    </button>
  )
}

function SignupOtpPanel({
  email,
  otpValue,
  onOtpChange,
  isVerifying,
  resendCooldown,
  onResend,
  isResending,
}: {
  email: string
  otpValue: string
  onOtpChange: (value: string) => void
  isVerifying: boolean
  resendCooldown: number
  onResend: () => void
  isResending: boolean
}) {
  return (
    <Field>
      <OtpPanelHeader email={email} />

      <OtpCodeInput
        otpValue={otpValue}
        onOtpChange={onOtpChange}
        isVerifying={isVerifying}
      />

      {isVerifying && (
        <FieldDescription theme="dark" className="mt-3 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Verifying code...
        </FieldDescription>
      )}
      <FieldDescription theme="dark" className="mt-2">
        Code expires in 10 minutes.
      </FieldDescription>

      <OtpResendButton
        resendCooldown={resendCooldown}
        onResend={onResend}
        isResending={isResending}
      />
    </Field>
  )
}

const SignupCredentialsForm = withForm({
  defaultValues: SIGNUP_DEFAULT_VALUES,
  props: {} as SignupCredentialsFormProps,
  render: ({
    form,
    emailState,
    onEmailBlur,
    invitationValid,
    isPending,
    submitDisabled,
  }) => (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <FieldGroup>
        <SignupAccountFields
          form={form}
          emailState={emailState}
          onEmailBlur={onEmailBlur}
        />
        <SignupSecurityFields form={form} invitationValid={invitationValid} />
        <SignupSubmitSection isPending={isPending} disabled={submitDisabled} />
      </FieldGroup>
    </form>
  ),
})

export function SignupForm({ token = '' }: SignupFormProps) {
  const vm = useSignupForm(token)

  if (vm.showOtpInput) {
    return (
      <SignupPageFrame showOtpInput>
        <SignupOtpPanel
          email={vm.form.state.values.email}
          otpValue={vm.otp.otpValue}
          onOtpChange={vm.otp.handleOtpComplete}
          isVerifying={vm.otp.isVerifying}
          resendCooldown={vm.resend.resendCooldown}
          onResend={vm.resend.handleResendOtp}
          isResending={vm.resend.isResending}
        />
      </SignupPageFrame>
    )
  }

  return (
    <SignupPageFrame showOtpInput={false}>
      <SignupCredentialsForm
        form={vm.form}
        emailState={vm.emailState}
        onEmailBlur={vm.handleEmailBlur}
        invitationValid={vm.emailState.invitationValid}
        isPending={vm.signupMutation.isPending}
        submitDisabled={isSignupSubmitDisabled(
          vm.signupMutation.isPending,
          vm.emailState.invitationValid,
          vm.signupMutation.data,
        )}
      />
    </SignupPageFrame>
  )
}
