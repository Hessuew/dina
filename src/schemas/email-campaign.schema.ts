import { z } from 'zod'

export const sendEmailCampaignSchema = z.object({
  campaign: z.enum(['invitation']),
  includeValidLinks: z.boolean().optional(),
})

export type SendEmailCampaignInput = z.infer<typeof sendEmailCampaignSchema>
