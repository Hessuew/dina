import { Section, Text } from '@react-email/components'
import { BaseEmail } from './BaseEmail'
import { infoBox, infoLabel, infoText, strongText } from './styles'

interface OTPVerificationEmailProps {
  otp: string
  expiryMinutes?: number
}

export function OTPVerificationEmail({
  otp,
  expiryMinutes = 10,
}: OTPVerificationEmailProps) {
  return (
    <BaseEmail preview="Your verification code" heading="Verify Your Email">
      <Text style={paragraph}>
        Thank you for joining the Disciplers of Nations Academy. To complete
        your registration, please use the verification code below:
      </Text>

      <Section style={otpContainer}>
        <Text style={otpLabel}>Verification Code</Text>
        <Text style={otpCode}>{otp}</Text>
      </Section>

      <Section style={infoBox}>
        <Text style={infoLabel}>Security Notice</Text>
        <Text style={infoText}>
          This code will expire in{' '}
          <strong style={strongText}>{expiryMinutes} minutes</strong> for your
          security.
        </Text>
      </Section>
    </BaseEmail>
  )
}

const paragraph = {
  color: '#4E463D',
  fontSize: '16px',
  lineHeight: '28px',
  textAlign: 'left' as const,
  margin: '0 0 32px 0',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  letterSpacing: '0.01em',
}

const otpContainer = {
  backgroundColor: '#FCFBF8',
  border: '1px solid rgba(197,160,89,0.3)',
  padding: '40px 32px',
  margin: '0 0 32px 0',
  textAlign: 'center' as const,
}

const otpLabel = {
  color: '#9B7A41',
  fontSize: '11px',
  fontWeight: '500',
  letterSpacing: '0.15em',
  textTransform: 'uppercase' as const,
  margin: '0 0 16px 0',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}

const otpCode = {
  fontSize: '48px',
  fontWeight: '400',
  letterSpacing: '12px',
  color: '#1C1815',
  margin: '0',
  fontFamily: 'Georgia, "Times New Roman", Times, serif',
}
