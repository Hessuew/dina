import { useEffect, useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { PasswordStrength } from '@/utils/password'
import aboutBackground from '@/assets/images/bg/bg_lecturers.webp'
import {
  AuthCenteredState,
  AuthFeaturePanel,
  AuthFormSurface,
  AuthLoadingState,
  AuthPageShell,
} from '@/components/auth/auth-layout'
import { Field, FieldDescription, FieldGroup } from '@/components/ui/field'
import { useAppForm, withForm } from '@/hooks/form'
import { useMutation } from '@/hooks/useMutation'
import { resetPasswordFn, validateResetTokenFn } from '@/utils/password-reset'
import { resetPasswordSchema } from '@/schemas/auth.schema'
import { calculatePasswordStrength } from '@/utils/password'
import {
  NO_TOKEN_ERROR,
  VALIDATION_FAILED_ERROR,
  resolveInvalidLinkMessage,
  resolveResetPasswordViewMode,
  resolveTokenValidationResult,
  validateConfirmPassword,
} from '@/components/auth/reset-password-form.domain'

interface ResetPasswordFormProps {
  token: string
}

const RESET_PASSWORD_DEFAULT_VALUES = { password: '', confirmPassword: '' }

function useResetTokenValidation(token: string) {
  const [isValidating, setIsValidating] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const validateTokenFn = useServerFn(validateResetTokenFn)

  useEffect(() => {
    if (!token) {
      setIsValidating(false)
      setTokenError(NO_TOKEN_ERROR)
      return
    }

    validateTokenFn({ data: { token } })
      .then((result: { valid: boolean; message: string }) => {
        const state = resolveTokenValidationResult(result)
        setTokenValid(state.tokenValid)
        setTokenError(state.tokenError)
      })
      .catch(() => {
        setTokenValid(false)
        setTokenError(VALIDATION_FAILED_ERROR)
      })
      .finally(() => {
        setIsValidating(false)
      })
  }, [token, validateTokenFn])

  return { isValidating, tokenValid, tokenError }
}

function useResetPasswordMutation() {
  const router = useRouter()
  return useMutation<
    { data: { token: string; newPassword: string } },
    { success: boolean; message: string }
  >({
    fn: useServerFn(resetPasswordFn),
    onSuccess: async (ctx) => {
      if (ctx.data.success) {
        toast.success('Password reset successful!', {
          description: 'You can now log in with your new password.',
        })
        await router.invalidate()
        router.navigate({ to: '/login' })
      } else {
        toast.error(ctx.data.message)
      }
    },
  })
}

function useResetPasswordForm(token: string) {
  const { isValidating, tokenValid, tokenError } =
    useResetTokenValidation(token)
  const resetMutation = useResetPasswordMutation()

  const form = useAppForm({
    defaultValues: RESET_PASSWORD_DEFAULT_VALUES,
    onSubmit: ({ value }) => {
      resetMutation.mutate({ data: { token, newPassword: value.password } })
    },
  })

  const viewMode = resolveResetPasswordViewMode({
    isValidating,
    tokenValid,
    tokenError,
  })

  return {
    viewMode,
    tokenError,
    form,
    isPending: resetMutation.isPending,
  }
}

function PasswordStrengthMeter({
  passwordStrength,
}: {
  passwordStrength: PasswordStrength
}) {
  return (
    <div className="mt-2">
      <div className="mb-1 flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full transition-all duration-300 ${passwordStrength.color}`}
            style={{
              width: `${(passwordStrength.score / 4) * 100}%`,
            }}
          />
        </div>
        <span className="text-xs font-medium text-[#D3CAC0]">
          {passwordStrength.label}
        </span>
      </div>
      {passwordStrength.suggestions.length > 0 && (
        <ul className="space-y-0.5 text-xs text-[#C9C0B6]">
          {passwordStrength.suggestions.map((suggestion, i) => (
            <li key={i}>• {suggestion}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

const ResetNewPasswordField = withForm({
  defaultValues: RESET_PASSWORD_DEFAULT_VALUES,
  render: ({ form }) => (
    <form.AppField
      name="password"
      validators={{
        onSubmit: resetPasswordSchema.shape.newPassword,
      }}
    >
      {(field) => (
        <>
          <field.TextField
            id="reset-password"
            label="New Password"
            type="password"
            required
          />
          <PasswordStrengthMeter
            passwordStrength={calculatePasswordStrength(field.state.value)}
          />
        </>
      )}
    </form.AppField>
  ),
})

const ResetConfirmPasswordField = withForm({
  defaultValues: RESET_PASSWORD_DEFAULT_VALUES,
  render: ({ form }) => (
    <form.AppField
      name="confirmPassword"
      validators={{
        onSubmit: ({ value, fieldApi }) =>
          validateConfirmPassword(value, fieldApi.form.state.values.password),
      }}
    >
      {(field) => (
        <field.TextField
          id="confirm-password"
          label="Confirm New Password"
          type="password"
          required
          description="Please confirm your new password."
        />
      )}
    </form.AppField>
  ),
})

function ResetSubmitSection({ isPending }: { isPending: boolean }) {
  return (
    <Field className="pt-2">
      <button
        type="submit"
        disabled={isPending}
        className="group inline-flex h-11 cursor-pointer items-center justify-center gap-3 border border-[#C5A059]/55 bg-linear-to-b from-[#2A2A2A] to-[#111111] px-8 font-serif text-base tracking-[0.12em] text-[#E9D9B4] shadow-[0_28px_60px_-28px_rgba(0,0,0,0.7)] transition-all hover:-translate-y-0.5 hover:border-[#D6B16E] hover:text-white disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:border-[#C5A059]/55 disabled:hover:text-[#E9D9B4]"
      >
        {isPending ? 'Resetting Password...' : 'Reset Password'}
      </button>

      <FieldDescription theme="dark" className="pt-1 text-center">
        Remember your password?{' '}
        <Link
          to="/login"
          className="text-[#C5A059] underline-offset-4 transition-colors hover:underline"
        >
          Back to login
        </Link>
      </FieldDescription>
    </Field>
  )
}

const ResetPasswordFields = withForm({
  defaultValues: RESET_PASSWORD_DEFAULT_VALUES,
  props: {} as { isPending: boolean },
  render: ({ form, isPending }) => (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <AuthFormSurface>
        <FieldGroup>
          <ResetNewPasswordField form={form} />
          <ResetConfirmPasswordField form={form} />
          <ResetSubmitSection isPending={isPending} />
        </FieldGroup>
      </AuthFormSurface>
    </form>
  ),
})

function ResetPasswordInvalidState({
  tokenError,
}: {
  tokenError: string | null
}) {
  return (
    <AuthCenteredState
      backgroundImage={aboutBackground}
      eyebrow="Error"
      title="Invalid Reset Link"
    >
      <p className="mt-6 text-base leading-8 font-light tracking-[0.04em] text-[#4E463D]">
        {resolveInvalidLinkMessage(tokenError)}
      </p>

      <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
        <Link to="/forgot-password">
          <button className="inline-flex h-11 items-center justify-center gap-3 border border-[#C5A059]/55 bg-linear-to-b from-[#2A2A2A] to-[#111111] px-8 font-serif text-base tracking-[0.12em] text-[#E9D9B4] shadow-[0_28px_60px_-28px_rgba(0,0,0,0.7)] transition-all hover:-translate-y-0.5 hover:border-[#D6B16E] hover:text-white">
            Request New Reset Link
          </button>
        </Link>
        <Link to="/login">
          <button className="inline-flex h-11 items-center justify-center border border-[#1A1A1A]/10 px-8 text-base tracking-[0.12em] text-[#1A1A1A] shadow-[0_16px_28px_-24px_rgba(0,0,0,0.28)] backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-[#C5A059]/45">
            Back to Login
          </button>
        </Link>
      </div>
    </AuthCenteredState>
  )
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const { viewMode, tokenError, form, isPending } = useResetPasswordForm(token)

  if (viewMode === 'loading') {
    return (
      <AuthLoadingState backgroundImage={aboutBackground}>
        <Loader2 className="h-8 w-8 animate-spin text-[#9B7A41]" />
      </AuthLoadingState>
    )
  }

  if (viewMode === 'invalid') {
    return <ResetPasswordInvalidState tokenError={tokenError} />
  }

  return (
    <AuthPageShell
      backgroundImage={aboutBackground}
      tone="light"
      eyebrow="Password Reset"
      title="Create new password"
      quote={
        <>
          "Create in me a clean heart, O God; and renew a right spirit within
          me."
        </>
      }
      scripture="Psalm 51:10"
    >
      <AuthFeaturePanel
        backgroundImage={aboutBackground}
        chip={{ label: 'Security', value: 'New Beginning' }}
      >
        <ResetPasswordFields form={form} isPending={isPending} />
      </AuthFeaturePanel>
    </AuthPageShell>
  )
}
