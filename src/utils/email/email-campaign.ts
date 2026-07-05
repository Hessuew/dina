import { createServerFn } from '@tanstack/react-start'
import { getCurrentUser } from '@/utils/auth/auth'
import { sendEmailCampaignSchema } from '@/schemas/email-campaign.schema'
import {
  previewEmailCampaignService,
  sendEmailCampaignService,
} from '@/utils/email/service/email-campaign.service'
import {
  getLockedEmailCampaigns,
  releaseEmailCampaignLock,
} from '@/utils/email/repository/email-campaign.repository'
import { authz } from '@/utils/authz'

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
  await authz(user.id).hasRole('admin')
  return getLockedEmailCampaigns()
})

export const releaseEmailCampaign = createServerFn({ method: 'POST' })
  .inputValidator(sendEmailCampaignSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    await releaseEmailCampaignLock(data.campaign, user.id)
  })
