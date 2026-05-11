import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
import graphiteBackground from '@/assets/images/bg/bg_courses.webp'
import {
  AuthFeaturePanel,
  AuthFormSurface,
  AuthPageShell,
} from '@/components/auth/auth-layout'
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
    <AuthPageShell
      backgroundImage={graphiteBackground}
      tone="dark"
      eyebrow="Password Recovery"
      title="Forgot your password?"
      quote={
        <>
          "The Lord is nigh unto them that are of a broken heart; and saveth
          such as be of a contrite spirit."
        </>
      }
      scripture="Psalm 34:18"
      showHairline
    >
      <AuthFeaturePanel
        backgroundImage={graphiteBackground}
        chip={{ label: 'Recovery', value: 'Restore Access' }}
        minHeightClassName="min-h-84 lg:min-h-100"
      >
        {requestSent && (
          <div className="mb-6 border border-green-500/30 bg-green-900/20 px-4 py-3 text-sm text-green-300">
            ✓ If an account exists with this email, you'll receive a password
            reset link shortly.
          </div>
        )}

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
