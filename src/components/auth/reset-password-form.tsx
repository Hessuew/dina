import { useEffect, useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import aboutBackground from '@/assets/images/bg/bg_lecturers.webp'
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
      <section
        className="relative isolate flex min-h-svh items-center justify-center overflow-hidden border-b border-[#1A1A1A]/10 text-[#1C1815]"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0.9), rgba(255,255,255,0.9)), url(${aboutBackground})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(197,160,89,0.12),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.28),transparent_22%)]" />
        <div className="relative flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#9B7A41]" />
        </div>
      </section>
    )
  }

  if (!tokenValid || tokenError) {
    return (
      <section
        className="relative isolate min-h-svh overflow-hidden border-b border-[#1A1A1A]/10 text-[#1C1815]"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0.9), rgba(255,255,255,0.9)), url(${aboutBackground})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(197,160,89,0.12),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.28),transparent_22%)]" />

        <div className="relative mx-auto max-w-[calc(100%-2rem)] px-5 py-18 sm:max-w-[calc(100%-4rem)] sm:px-6 sm:py-22 lg:max-w-[calc(100%-8rem)] lg:px-12 lg:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex flex-col items-center gap-3 text-[0.68rem] font-medium tracking-[0.3em] text-[#9B7A41] uppercase">
              <div className="h-px w-16 bg-[#9B7A41]/50" />
              Error
            </div>

            <h1 className="mt-6 font-serif text-[clamp(3rem,5vw,5.1rem)] leading-[0.92] tracking-[-0.055em] text-[#1C1815]">
              Invalid Reset Link
            </h1>

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
          </div>
        </div>
      </section>
    )
  }

  return (
    <section
      className="relative isolate min-h-svh overflow-hidden border-b border-[#1A1A1A]/10 text-[#1C1815]"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0.9), rgba(255,255,255,0.9)), url(${aboutBackground})`,
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
                  Password Reset
                </div>
              </div>

              <h1 className="max-w-[14ch] font-serif text-[clamp(3rem,5vw,5.1rem)] leading-[0.92] tracking-[-0.055em] text-[#1C1815]">
                Create new password
              </h1>

              <p className="max-w-xl text-base leading-8 font-light tracking-[0.04em] text-[#4E463D] sm:text-lg">
                "Create in me a clean heart, O God; and renew a right spirit
                within me."
                <br />
                <span className="text-[0.72rem] font-medium tracking-[0.2em] text-[#9B7A41] uppercase">
                  Psalm 51:10
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
                backgroundImage: `linear-gradient(180deg, rgba(7,7,8,0.26), rgba(7,7,8,0.72)), url(${aboutBackground})`,
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
                    Security
                  </div>
                  <div className="mt-2 font-serif text-xl leading-tight text-[#F8F4EC]">
                    New Beginning
                  </div>
                </div>
              </div>
            </div>

            <div className="gap-5 border-x border-b border-white/10 bg-[#151515]/88 px-6 py-7 sm:px-8 sm:py-8">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  void form.handleSubmit()
                }}
              >
                <div className="min-h-76 border border-white/10 bg-white/3 p-5 shadow-[0_22px_36px_-30px_rgba(0,0,0,0.4)]">
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
                                {passwordStrength.suggestions.map(
                                  (suggestion, i) => (
                                    <li key={i}>• {suggestion}</li>
                                  ),
                                )}
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

                      <FieldDescription
                        theme="dark"
                        className="pt-1 text-center"
                      >
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
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
