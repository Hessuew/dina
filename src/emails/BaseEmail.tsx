import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

interface BaseEmailProps {
  preview: string
  heading: string
  children: React.ReactNode
}

export function BaseEmail({ preview, heading, children }: BaseEmailProps) {
  // const baseUrl = process.env.VITE_SITE_URL || 'http://localhost:5173'
  const baseUrl = '	https://christ-dina.org/assets/bg_hero-CU-t5jGy.webp'

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          ...main,
          backgroundImage: `url(${baseUrl})`,
          // backgroundImage: `linear-gradient(rgba(248,244,236,0.96), rgba(247,244,238,0.98)), url(${baseUrl}/src/assets/images/bg/bg_hero.webp)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <Container style={container}>
          <Section style={header}>
            <Text>DINA</Text>
          </Section>
          <Section style={contentWrapper}>
            <Heading style={h1}>{heading}</Heading>
            <Section style={content}>{children}</Section>
          </Section>
          <Section style={footer}>
            <div style={divider} />
            <Text style={footerText}>
              If you didn't expect this email, you can safely ignore it.
            </Text>
            <Text style={footerCopy}>
              © {new Date().getFullYear()} DINA — Disciplers of Nations Academy
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#F8F4EC',
  fontFamily:
    'Georgia, "Times New Roman", Times, serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  padding: '40px 20px',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  maxWidth: '600px',
  border: '1px solid rgba(26,26,26,0.1)',
  boxShadow: '0 24px 48px -20px rgba(0,0,0,0.15)',
}

const header = {
  padding: '40px 40px 32px',
  textAlign: 'center' as const,
  borderBottom: '1px solid rgba(197,160,89,0.2)',
}

const contentWrapper = {
  padding: '48px 40px',
}

const h1 = {
  color: '#1C1815',
  fontSize: '32px',
  fontWeight: '400',
  fontFamily: 'Georgia, "Times New Roman", Times, serif',
  letterSpacing: '-0.02em',
  lineHeight: '1.2',
  margin: '0 0 24px 0',
  padding: '0',
}

const content = {
  margin: '0',
}

const footer = {
  padding: '32px 40px 40px',
  backgroundColor: '#FCFBF8',
}

const divider = {
  height: '1px',
  backgroundColor: 'rgba(197,160,89,0.25)',
  margin: '0 0 24px 0',
}

const footerText = {
  color: '#5E5549',
  fontSize: '14px',
  lineHeight: '22px',
  textAlign: 'center' as const,
  margin: '0 0 12px 0',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}

const footerCopy = {
  color: '#9B8A73',
  fontSize: '12px',
  lineHeight: '18px',
  textAlign: 'center' as const,
  margin: '0',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  letterSpacing: '0.02em',
}
