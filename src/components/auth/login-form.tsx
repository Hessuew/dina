import { Link, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import facultyBackground from '@/assets/images/bg/bg_hero.webp'
import {
  AuthFeaturePanel,
  AuthFormSurface,
  AuthPageShell,
} from '@/components/auth/auth-layout'
import { Field, FieldGroup } from '@/components/ui/field'
import { useAppForm } from '@/hooks/form'
import { useMutation } from '@/hooks/useMutation'
import { loginFn } from '@/routes/_authed'
import { loginSchema } from '@/schemas/auth.schema'
import { getLoginErrorMessage } from '@/utils/auth/domain/login-error.domain'

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
        toast.error(getLoginErrorMessage(ctx.data.message))
      }
    },
  })

  const form = useAppForm({
    defaultValues: { email: '', password: '' },
    onSubmit: ({ value }) => {
      loginMutation.mutate({
        data: {
          email: value.email,
          password: value.password,
        },
      })
    },
  })

  return (
    <AuthPageShell
      backgroundImage={facultyBackground}
      tone="light"
      eyebrow="Login Portal"
      title="Welcome back"
      quote={
        <>
          "Through desire a man, having separated himself, seeketh and
          intermeddleth with all wisdom."
        </>
      }
      scripture="Proverbs 18:1"
      titleClassName="max-w-[10ch]"
    >
      <AuthFeaturePanel
        backgroundImage={facultyBackground}
        chip={{ label: 'Theme', value: 'Learn Christ, not Theology' }}
      >
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
          <AuthFormSurface>
            <FieldGroup>
              <form.AppField
                name="email"
                validators={{ onSubmit: loginSchema.shape.email }}
              >
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

              <form.AppField
                name="password"
                validators={{ onSubmit: loginSchema.shape.password }}
              >
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
          </AuthFormSurface>
        </form>
      </AuthFeaturePanel>
    </AuthPageShell>
  )
}
