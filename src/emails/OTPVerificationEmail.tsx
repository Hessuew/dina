import { Text } from '@react-email/components'
import { BaseEmail } from './BaseEmail'

interface OTPVerificationEmailProps {
  otp: string
  expiryMinutes?: number
}

export function OTPVerificationEmail({
  otp,
  expiryMinutes = 10,
}: OTPVerificationEmailProps) {
  return (
    <BaseEmail
      preview="Your verification code"
      heading="Verify Your Email"
    >
      <Text style={paragraph}>
        Thank you for creating an account! To complete your registration,
        please use the verification code below:
      </Text>

      <div style={otpContainer}>
        <Text style={otpCode}>{otp}</Text>
      </div>

      <Text style={paragraph}>
        This code will expire in <strong>{expiryMinutes} minutes</strong> for
        security reasons.
      </Text>

      <Text style={noteText}>
        If you didn't request this code, you can safely ignore this email.
      </Text>
    </BaseEmail>
  )
}

const paragraph = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '24px',
  textAlign: 'left' as const,
  marginBottom: '16px',
}

const otpContainer = {
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  padding: '32px',
  margin: '32px 0',
  textAlign: 'center' as const,
  border: '2px dashed #e0e0e0',
}

const otpCode = {
  fontSize: '48px',
  fontWeight: '700',
  letterSpacing: '8px',
  color: '#2563eb',
  margin: '0',
  fontFamily: 'monospace',
}

const noteText = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '20px',
  marginTop: '24px',
  fontStyle: 'italic',
}
