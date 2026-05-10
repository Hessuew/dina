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
