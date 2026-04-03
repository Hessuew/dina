import { Link, useRouter } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useMutation } from '@/hooks/useMutation'
import { loginFn } from '@/routes/_authed'

interface LoginFormProps extends React.ComponentProps<'div'> {
  verified?: boolean
}

export function LoginForm({
  className,
  verified = false,
  ...props
}: LoginFormProps) {
  const router = useRouter()

  const loginMutation = useMutation({
    fn: loginFn,
    onSuccess: async (ctx) => {
      if (!ctx.data?.error) {
        await router.invalidate()
        router.navigate({ to: '/dashboard' })
        return
      }
    },
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)

    loginMutation.mutate({
      data: {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
      },
    })
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {verified && (
            <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              ✓ Email verified successfully! You can now log in to your account.
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <a
                    href="#"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </a>
                </div>
                <Input id="password" name="password" type="password" required />
              </Field>
              <Field>
                <Button
                  type="submit"
                  disabled={loginMutation.status === 'pending'}
                >
                  {loginMutation.status === 'pending'
                    ? 'Logging in...'
                    : 'Login'}
                </Button>
                {loginMutation.data?.error && (
                  <div className="text-sm text-red-600">
                    {loginMutation.data.message}
                  </div>
                )}
                <FieldDescription className="text-center">
                  Don&apos;t have an account?{' '}
                  <Link
                    to="/signup"
                    search={{ token: '' }}
                    className="underline"
                  >
                    Sign up
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
