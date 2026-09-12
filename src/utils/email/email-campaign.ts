import { createServerFn } from '@tanstack/react-start'
import { getCurrentUser } from '@/utils/auth/auth'
import { sendEmailCampaignSchema } from '@/schemas/email-campaign.schema'
import {
  getEmailCampaignLocksService,
  previewEmailCampaignService,
  releaseEmailCampaignService,
  sendEmailCampaignService,
} from '@/utils/email/service/email-campaign.service'

export const previewEmailCampaign = createServerFn({ method: 'POST' })
  .inputValidator(sendEmailCampaignSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return previewEmailCampaignService(data, user.id)
  })

export const sendEmailCampaign = createServerFn({ method: 'POST' })
  .inputValidator(sendEmailCampaignSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return sendEmailCampaignService(data, user.id)
  })

export const getEmailCampaignLocks = createServerFn({
  method: 'GET',
}).handler(async () => {
  const user = await getCurrentUser()
  return getEmailCampaignLocksService(user.id)
})

export const releaseEmailCampaign = createServerFn({ method: 'POST' })
  .inputValidator(sendEmailCampaignSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    await releaseEmailCampaignService(data, user.id)
  })
