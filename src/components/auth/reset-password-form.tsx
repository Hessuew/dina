import { useEffect, useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import aboutBackground from '@/assets/images/bg/bg_lecturers.webp'
import {
  AuthCenteredState,
  AuthFeaturePanel,
  AuthFormSurface,
  AuthLoadingState,
  AuthPageShell,
} from '@/components/auth/auth-layout'
import { Field, FieldDescription, FieldGroup } from '@/components/ui/field'
import { useAppForm } from '@/hooks/form'
import { useMutation } from '@/hooks/useMutation'
import { resetPasswordFn, validateResetTokenFn } from '@/routes/reset-password'
import { resetPasswordSchema } from '@/schemas/auth.schema'
import { calculatePasswordStrength } from '@/utils/password'

interface ResetPasswordFormProps {
  token: string
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [isValidating, setIsValidating] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const router = useRouter()

  const validateTokenFn = useServerFn(validateResetTokenFn)

  const resetMutation = useMutation<
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

  const form = useAppForm({
    defaultValues: { password: '', confirmPassword: '' },
    onSubmit: ({ value }) => {
      resetMutation.mutate({ data: { token, newPassword: value.password } })
    },
  })

  const passwordStrength = calculatePasswordStrength(form.state.values.password)

  useEffect(() => {
    if (!token) {
      setIsValidating(false)
      setTokenError('No reset token provided')
      return
    }

    validateTokenFn({ data: { token } })
      .then((result: { valid: boolean; message: string }) => {
        if (result.valid) {
          setTokenValid(true)
          setTokenError(null)
        } else {
          setTokenValid(false)
          setTokenError(result.message)
        }
      })
      .catch(() => {
        setTokenValid(false)
        setTokenError('Failed to validate reset token')
      })
      .finally(() => {
        setIsValidating(false)
      })
  }, [token, validateTokenFn])

  if (isValidating) {
    return (
      <AuthLoadingState backgroundImage={aboutBackground}>
        <Loader2 className="h-8 w-8 animate-spin text-[#9B7A41]" />
      </AuthLoadingState>
    )
  }

  if (!tokenValid || tokenError) {
    return (
      <AuthCenteredState
        backgroundImage={aboutBackground}
        eyebrow="Error"
        title="Invalid Reset Link"
      >
        <p className="mt-6 text-base leading-8 font-light tracking-[0.04em] text-[#4E463D]">
          {tokenError || 'The reset link is invalid or has expired.'}
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
        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            void form.handleSubmit()
          }}
        >
          <AuthFormSurface>
            <FieldGroup>
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
                  </>
                )}
              </form.AppField>

              <form.AppField
                name="confirmPassword"
                validators={{
                  onSubmit: ({ value, fieldApi }) => {
                    if (!value) return 'Please confirm your password'
                    if (value !== fieldApi.form.state.values.password)
                      return 'Passwords do not match'
                    return undefined
                  },
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

              <Field className="pt-2">
                <button
                  type="submit"
                  disabled={resetMutation.isPending}
                  className="group inline-flex h-11 cursor-pointer items-center justify-center gap-3 border border-[#C5A059]/55 bg-linear-to-b from-[#2A2A2A] to-[#111111] px-8 font-serif text-base tracking-[0.12em] text-[#E9D9B4] shadow-[0_28px_60px_-28px_rgba(0,0,0,0.7)] transition-all hover:-translate-y-0.5 hover:border-[#D6B16E] hover:text-white disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:border-[#C5A059]/55 disabled:hover:text-[#E9D9B4]"
                >
                  {resetMutation.isPending
                    ? 'Resetting Password...'
                    : 'Reset Password'}
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
            </FieldGroup>
          </AuthFormSurface>
        </form>
      </AuthFeaturePanel>
    </AuthPageShell>
  )
}
