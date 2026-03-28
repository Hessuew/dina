import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
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
import { signupFn } from '@/routes/signup'
import {
  checkInvitationByEmail,
  getInvitationByToken,
} from '@/utils/invitations'
import { calculatePasswordStrength } from '@/utils/password'

interface SignupFormProps extends React.ComponentProps<typeof Card> {
  token?: string
}

export function SignupForm({ token = '', ...props }: SignupFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [invitationValid, setInvitationValid] = useState(false)
  const [invitationError, setInvitationError] = useState<string | null>(null)
  const [invitationRole, setInvitationRole] = useState<string | null>(null)
  const [isLoadingToken, setIsLoadingToken] = useState(!!token)

  const signupMutation = useMutation<
    {
      data: {
        email: string
        password: string
        fullName?: string
        token: string
      }
    },
    { error: boolean; message: string }
  >({
    fn: useServerFn(signupFn),
    onSuccess: (ctx) => {
      if (ctx.data.error) {
        toast.error(ctx.data.message)
      } else {
        toast.success('Account created!', {
          description:
            'Check your email to verify your account and complete registration.',
          duration: 6000,
        })
      }
    },
  })

  const checkEmailFn = useServerFn(checkInvitationByEmail)
  const getTokenFn = useServerFn(getInvitationByToken)

  const passwordStrength = password ? calculatePasswordStrength(password) : null

  // Auto-fill email from token on mount
  useEffect(() => {
    if (token) {
      setIsLoadingToken(true)
      getTokenFn({ data: { token } })
        .then((result) => {
          if (!result.error) {
            setEmail(result.invitation.email)
            setInvitationValid(true)
            setInvitationRole(result.invitation.role)
          } else {
            setInvitationError(result.message)
            toast.error('Invalid invitation', {
              description: result.message,
            })
          }
        })
        .catch(() => {
          const errorMsg = 'Unable to load invitation. Please check your link.'
          setInvitationError(errorMsg)
          toast.error('Error loading invitation', {
            description: errorMsg,
          })
        })
        .finally(() => {
          setIsLoadingToken(false)
        })
    }
  }, [token, getTokenFn])

  const handleEmailBlur = async () => {
    if (!email || email.length < 3) return

    setIsCheckingEmail(true)
    setInvitationError(null)

    try {
      const result = await checkEmailFn({ data: { email } })
      if (result.error) {
        setInvitationError(result.message)
        setInvitationValid(false)
        toast.error('Email not invited', {
          description: result.message,
        })
      } else {
        setInvitationValid(true)
        setInvitationRole(result.invitation.role)
        setInvitationError(null)
      }
    } catch (error) {
      const errorMsg = 'Unable to verify email. Please try again.'
      setInvitationError(errorMsg)
      setInvitationValid(false)
      toast.error('Verification failed', {
        description: errorMsg,
      })
    } finally {
      setIsCheckingEmail(false)
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!invitationValid) {
      setInvitationError('Please enter a valid email with an invitation')
      return
    }

    const formData = new FormData(e.target as HTMLFormElement)
    const passwordValue = formData.get('password') as string
    const confirmPassword = formData.get('confirm-password') as string
    const tokenField = formData.get('token') as string

    if (passwordValue !== confirmPassword) {
      alert('Passwords do not match')
      return
    }

    signupMutation.mutate({
      data: {
        email,
        password: passwordValue,
        fullName: formData.get('name') as string,
        token: tokenField,
      },
    })
  }

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          Enter your email to check for an invitation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <div className="relative">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={handleEmailBlur}
                  required
                  disabled={invitationValid || isLoadingToken}
                />
                {(isCheckingEmail || isLoadingToken) && (
                  <div className="absolute top-1/2 right-3 -translate-y-1/2">
                    <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                  </div>
                )}
              </div>
              {isCheckingEmail && (
                <FieldDescription className="text-muted-foreground">
                  Checking email...
                </FieldDescription>
              )}
              {isLoadingToken && (
                <FieldDescription className="text-muted-foreground">
                  Loading invitation...
                </FieldDescription>
              )}
              {invitationError && (
                <FieldDescription className="text-destructive">
                  {invitationError}
                </FieldDescription>
              )}
              {invitationValid && invitationRole && (
                <FieldDescription className="text-green-600">
                  ✓ Invitation found! You&apos;re invited as a {invitationRole}
                </FieldDescription>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="name">Full Name</FieldLabel>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="John Doe"
                required
                disabled={!invitationValid}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                minLength={8}
                required
                disabled={!invitationValid}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {password && passwordStrength && (
                <div className="mt-2">
                  <div className="mb-1 flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{
                          width: `${(passwordStrength.score / 4) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-700">
                      {passwordStrength.label}
                    </span>
                  </div>
                  {passwordStrength.suggestions.length > 0 && (
                    <ul className="space-y-0.5 text-xs text-gray-600">
                      {passwordStrength.suggestions.map((suggestion, i) => (
                        <li key={i}>• {suggestion}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {!password && (
                <FieldDescription>
                  Must be at least 8 characters long.
                </FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">
                Confirm Password
              </FieldLabel>
              <Input
                id="confirm-password"
                name="confirm-password"
                type="password"
                required
                disabled={!invitationValid}
              />
              <FieldDescription>Please confirm your password.</FieldDescription>
            </Field>
            <input type="hidden" name="token" value={token} />
            <FieldGroup>
              <Field>
                <Button
                  type="submit"
                  disabled={
                    signupMutation.status === 'pending' ||
                    !invitationValid ||
                    (signupMutation.data !== undefined &&
                      !signupMutation.data.error)
                  }
                >
                  {signupMutation.status === 'pending'
                    ? 'Creating Account...'
                    : 'Create Account'}
                </Button>
                <FieldDescription className="px-6 text-center">
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    search={{ verified: false }}
                    className="underline"
                  >
                    Sign in
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
