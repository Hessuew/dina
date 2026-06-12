import { Link, Section, Text } from '@react-email/components'
import { BaseEmail } from './BaseEmail'
import {
  alternativeText,
  button,
  buttonContainer,
  infoBox,
  infoLabel,
  infoText,
  linkText,
  paragraph,
  strongText,
} from './styles'

interface PasswordResetEmailProps {
  resetLink: string
  expiryMinutes?: number
}

export function PasswordResetEmail({
  resetLink,
  expiryMinutes = 10,
}: PasswordResetEmailProps) {
  return (
    <BaseEmail preview="Reset your password" heading="Reset Your Password">
      <Text style={paragraph}>
        We received a request to reset your password. Click the button below to
        create a new password:
      </Text>

      <Section style={buttonContainer}>
        <Link href={resetLink} style={button}>
          Reset Password
        </Link>
      </Section>

      <Text style={alternativeText}>
        Or copy and paste this link into your browser:
      </Text>

      <Text style={linkText}>{resetLink}</Text>

      <Section style={infoBox}>
        <Text style={infoLabel}>Security Notice</Text>
        <Text style={infoText}>
          This link will expire in{' '}
          <strong style={strongText}>{expiryMinutes} minutes</strong> for your
          security.
        </Text>
      </Section>
    </BaseEmail>
  )
}
