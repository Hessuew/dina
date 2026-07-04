import { createServerFn } from '@tanstack/react-start'
import { getCurrentUser } from '@/utils/auth/auth'
import { sendWhatsAppCampaignSchema } from '@/schemas/whatsapp.schema'
import {
  previewWhatsAppCampaignService,
  sendWhatsAppCampaignService,
} from '@/utils/whatsapp/service/whatsapp.service'
import {
  getLockedCampaigns,
  releaseWhatsAppCampaignLock,
} from '@/utils/whatsapp/repository/whatsapp.repository'
import { authz } from '@/utils/authz'

export const previewWhatsAppCampaign = createServerFn({ method: 'POST' })
  .inputValidator(sendWhatsAppCampaignSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return previewWhatsAppCampaignService(data, user.id)
  })

export const sendWhatsAppCampaign = createServerFn({ method: 'POST' })
  .inputValidator(sendWhatsAppCampaignSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return sendWhatsAppCampaignService(data, user.id)
  })

export const getWhatsAppCampaignLocks = createServerFn({
  method: 'GET',
}).handler(async () => {
  const user = await getCurrentUser()
  await authz(user.id).hasRole('admin')
  return getLockedCampaigns()
})

export const releaseWhatsAppCampaign = createServerFn({ method: 'POST' })
  .inputValidator(sendWhatsAppCampaignSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    await releaseWhatsAppCampaignLock(data.campaign, user.id)
  })
