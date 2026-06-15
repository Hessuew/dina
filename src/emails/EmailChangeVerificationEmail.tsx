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

interface EmailChangeVerificationEmailProps {
  verifyLink: string
  newEmail: string
}

export function EmailChangeVerificationEmail({
  verifyLink,
  newEmail,
}: EmailChangeVerificationEmailProps) {
  return (
    <BaseEmail
      preview="Verify your new email address"
      heading="Verify Your New Email"
    >
      <Text style={paragraph}>
        You requested to change your email address to{' '}
        <strong style={strongText}>{newEmail}</strong>. Click the button below
        to confirm this is your email address:
      </Text>

      <Section style={buttonContainer}>
        <Link href={verifyLink} style={button}>
          Verify Email Address
        </Link>
      </Section>

      <Text style={alternativeText}>
        Or copy and paste this link into your browser:
      </Text>

      <Text style={linkText}>{verifyLink}</Text>

      <Section style={infoBox}>
        <Text style={infoLabel}>Security Notice</Text>
        <Text style={infoText}>
          This link will expire in <strong style={strongText}>24 hours</strong>.
          If you did not request this change, you can safely ignore this email.
        </Text>
      </Section>
    </BaseEmail>
  )
}
