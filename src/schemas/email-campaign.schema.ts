import { z } from 'zod'

export const sendEmailCampaignSchema = z.object({
  campaign: z.enum(['invitation']),
})

export type SendEmailCampaignInput = z.infer<typeof sendEmailCampaignSchema>
