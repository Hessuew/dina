import { describe, expect, it } from 'vitest'
import {
  WHATSAPP_TEMPLATES,
  buildTemplatePayload,
  resolveCampaign,
  resolveRecipientName,
} from './templates.domain'

describe('WHATSAPP_TEMPLATES', () => {
  it('defines both templates as English Utility with a {{1}} body variable', () => {
    for (const template of Object.values(WHATSAPP_TEMPLATES)) {
      expect(template.language).toBe('en')
      expect(template.category).toBe('utility')
      expect(template.body).toContain('{{1}}')
    }
  })
})

describe('resolveCampaign', () => {
  it('pairs congratulations with the approved cohort', () => {
    expect(resolveCampaign('congratulations')).toEqual({
      templateName: 'dina_congratulations',
      cohort: 'approved',
    })
  })

  it('pairs signup_reminder with the not_registered cohort', () => {
    expect(resolveCampaign('signup_reminder')).toEqual({
      templateName: 'dina_signup_reminder',
      cohort: 'not_registered',
    })
  })
})

describe('resolveRecipientName', () => {
  it('prefers the preferred name', () => {
    expect(resolveRecipientName('Sam', 'Samuel Johnson')).toBe('Sam')
  })

  it('falls back to the first token of the full legal name', () => {
    expect(resolveRecipientName(null, 'Maria de la Cruz')).toBe('Maria')
  })

  it('treats a whitespace-only preferred name as absent', () => {
    expect(resolveRecipientName('   ', 'Maria de la Cruz')).toBe('Maria')
  })

  it('returns empty string for a blank full legal name', () => {
    expect(resolveRecipientName(null, '   ')).toBe('')
  })
})

describe('buildTemplatePayload', () => {
  it('builds the Cloud API template payload with the name as {{1}}', () => {
    expect(buildTemplatePayload('dina_congratulations', 'Maria')).toEqual({
      name: 'dina_congratulations',
      language: { code: 'en' },
      components: [
        { type: 'body', parameters: [{ type: 'text', text: 'Maria' }] },
      ],
    })
  })
})
