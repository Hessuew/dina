import { z } from 'zod'

export const sendWhatsAppCampaignSchema = z.object({
  campaign: z.enum(['congratulations', 'signup_reminder']),
})

export type SendWhatsAppCampaignInput = z.infer<
  typeof sendWhatsAppCampaignSchema
>
