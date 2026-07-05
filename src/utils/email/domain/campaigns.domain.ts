import type { emailMessages } from '@/db/schema'

export type EmailCampaignType = 'invitation'
export type EmailCampaignCohort = 'approved_not_registered'
export type EmailType = (typeof emailMessages.$inferSelect)['emailType']

export function resolveEmailCampaign(campaign: EmailCampaignType): {
  emailType: EmailType
  cohort: EmailCampaignCohort
} {
  campaign satisfies EmailCampaignType
  return { emailType: 'invitation', cohort: 'approved_not_registered' }
}
