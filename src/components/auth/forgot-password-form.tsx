import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
import graphiteBackground from '@/assets/images/bg/bg_courses.webp'
import { Field, FieldDescription, FieldGroup } from '@/components/ui/field'
import { useAppForm } from '@/hooks/form'
import { useMutation } from '@/hooks/useMutation'
import { requestPasswordResetFn } from '@/routes/forgot-password'
import { requestPasswordResetSchema } from '@/schemas/auth.schema'

export function ForgotPasswordForm() {
  const [resendCooldown, setResendCooldown] = useState(0)
  const [requestSent, setRequestSent] = useState(false)

  const resetMutation = useMutation<
    { data: { email: string } },
    { success: boolean; message: string }
  >({
    fn: useServerFn(requestPasswordResetFn),
    onSuccess: (ctx) => {
      if (ctx.data.success) {
        setRequestSent(true)
        setResendCooldown(60)
        toast.success('Reset link sent!', {
          description: ctx.data.message,
          duration: 6000,
        })
      } else {
        toast.error(ctx.data.message)
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

  const form = useAppForm({
    defaultValues: { email: '' },
    onSubmit: ({ value }) => {
      if (resendCooldown > 0) {
        toast.error(`Please wait ${resendCooldown} seconds before trying again`)
        return
      }
      resetMutation.mutate({ data: { email: value.email } })
    },
  })

  return (
    <section
      className="relative isolate min-h-svh overflow-hidden border-b border-[#1A1A1A]/10 text-[#1C1815]"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(10,10,11,0.9), rgba(16,16,17,0.95)), url(${graphiteBackground})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(197,160,89,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.06),transparent_22%)]" />
      <div className="absolute right-[8%] bottom-24 h-px w-16 bg-white/12 lg:w-24" />

      <div className="relative mx-auto max-w-[calc(100%-2rem)] px-5 py-18 sm:max-w-[calc(100%-4rem)] sm:px-6 sm:py-22 lg:max-w-[calc(100%-8rem)] lg:px-12 lg:py-24">
        <div className="grid items-start gap-14 lg:grid-cols-[minmax(0,0.82fr)_minmax(24rem,1.18fr)] lg:gap-20">
          <div className="flex h-full flex-1 flex-col justify-between space-y-10">
            <div className="space-y-6">
              <div className="inline-flex flex-col gap-2 text-[0.72rem] font-medium tracking-[0.3em] text-[#9B7A41] uppercase">
                <div className="h-px w-20 bg-[#C5A059]/50 lg:w-28" />
                <div className="flex flex-row items-center gap-3">
                  <span className="h-px w-10 bg-[#C5A059]/55" />
                  Password Recovery
                </div>
              </div>

              <h1 className="max-w-[14ch] font-serif text-[clamp(3rem,5vw,5.1rem)] leading-[0.92] tracking-[-0.055em] text-[#F8F4EC]">
                Forgot your password?
              </h1>

              <p className="max-w-xl text-base leading-8 font-light tracking-[0.04em] text-[#CFC6B7] sm:text-lg">
                "The Lord is nigh unto them that are of a broken heart; and
                saveth such as be of a contrite spirit."
                <br />
                <span className="text-[0.72rem] font-medium tracking-[0.2em] text-[#9B7A41] uppercase">
                  Psalm 34:18
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
                backgroundImage: `linear-gradient(180deg, rgba(7,7,8,0.26), rgba(7,7,8,0.72)), url(${graphiteBackground})`,
                backgroundPosition: 'center',
                backgroundSize: 'cover',
              }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),transparent_38%,rgba(197,160,89,0.14)_100%)]" />
              <div className="relative flex min-h-84 flex-col justify-between p-6 sm:p-8 lg:min-h-100">
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
                    Recovery
                  </div>
                  <div className="mt-2 font-serif text-xl leading-tight text-[#F8F4EC]">
                    Restore Access
                  </div>
                </div>
              </div>
            </div>

            <div className="gap-5 border-x border-b border-white/10 bg-[#151515]/88 px-6 py-7 sm:px-8 sm:py-8">
              {requestSent && (
                <div className="mb-6 border border-green-500/30 bg-green-900/20 px-4 py-3 text-sm text-green-300">
                  ✓ If an account exists with this email, you'll receive a
                  password reset link shortly.
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
                    <form.AppField
                      name="email"
                      validators={{
                        onSubmit: requestPasswordResetSchema.shape.email,
                      }}
                    >
                      {(field) => (
                        <field.TextField
                          id="email"
                          label="Email Address"
                          type="email"
                          placeholder="your@email.com"
                          required
                        />
                      )}
                    </form.AppField>

                    <Field className="pt-2">
                      <button
                        type="submit"
                        disabled={resetMutation.isPending || resendCooldown > 0}
                        className="group inline-flex h-11 cursor-pointer items-center justify-center gap-3 border border-[#C5A059]/55 bg-linear-to-b from-[#2A2A2A] to-[#111111] px-8 font-serif text-base tracking-[0.12em] text-[#E9D9B4] shadow-[0_28px_60px_-28px_rgba(0,0,0,0.7)] transition-all hover:-translate-y-0.5 hover:border-[#D6B16E] hover:text-white disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:border-[#C5A059]/55 disabled:hover:text-[#E9D9B4]"
                      >
                        {resetMutation.isPending
                          ? 'Sending...'
                          : resendCooldown > 0
                            ? `Resend in ${resendCooldown}s`
                            : 'Send Reset Link'}
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
