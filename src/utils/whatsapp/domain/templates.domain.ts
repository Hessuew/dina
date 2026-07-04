/**
 * Canonical WhatsApp template definitions — the source of truth for what is
 * submitted to Meta for approval. Both are Utility-category, English, with a
 * single positional variable {{1}} = recipient name. Business-initiated
 * messages MUST use a Meta-approved template; the `body` here must match the
 * approved template text exactly (Meta fills only the {{1}} parameter).
 */
export const WHATSAPP_TEMPLATES = {
  dina_congratulations: {
    name: 'dina_congratulations',
    language: 'en',
    category: 'utility',
    body: 'Congratulations {{1}}! You have been accepted to Disciplers of Nations Academy. We are excited to welcome you — please check your email for your registration invitation and next steps.',
  },
  dina_signup_reminder: {
    name: 'dina_signup_reminder',
    language: 'en',
    category: 'utility',
    body: 'Hi {{1}}, this is a friendly reminder from Disciplers of Nations Academy: your registration invitation is waiting. Please check your email and complete your signup to secure your place.',
  },
} as const

export type WhatsAppTemplateName = keyof typeof WHATSAPP_TEMPLATES

export type CampaignType = 'congratulations' | 'signup_reminder'

export type CampaignCohort = 'approved' | 'not_registered'

/**
 * Fixed campaign → (template, cohort) pairs: congratulations goes to Approved
 * enrollments, the signup reminder to invited-but-not-yet-registered ones
 * (see CONTEXT.md → Email Export Cohorts for the cohort definitions).
 */
export function resolveCampaign(campaign: CampaignType): {
  templateName: WhatsAppTemplateName
  cohort: CampaignCohort
} {
  switch (campaign) {
    case 'congratulations':
      return { templateName: 'dina_congratulations', cohort: 'approved' }
    case 'signup_reminder':
      return { templateName: 'dina_signup_reminder', cohort: 'not_registered' }
  }
}

/** {{1}} value: preferred name, else the first token of the full legal name. */
export function resolveRecipientName(
  preferredName: string | null,
  fullLegalName: string,
): string {
  const preferred = preferredName?.trim()
  if (preferred) return preferred
  return fullLegalName.trim().split(/\s+/)[0]
}

/** Cloud API `template` payload for a send (language + {{1}} body parameter). */
export function buildTemplatePayload(
  templateName: WhatsAppTemplateName,
  recipientName: string,
): {
  name: string
  language: { code: string }
  components: Array<{
    type: 'body'
    parameters: Array<{ type: 'text'; text: string }>
  }>
} {
  const template = WHATSAPP_TEMPLATES[templateName]
  return {
    name: template.name,
    language: { code: template.language },
    components: [
      { type: 'body', parameters: [{ type: 'text', text: recipientName }] },
    ],
  }
}
