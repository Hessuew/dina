import { createServerFn } from '@tanstack/react-start'
import { getCurrentUser } from '@/utils/auth/auth'
import { sendWhatsAppCampaignSchema } from '@/schemas/whatsapp.schema'
import {
  getWhatsAppCampaignLocksService,
  previewWhatsAppCampaignService,
  releaseWhatsAppCampaignService,
  sendWhatsAppCampaignService,
} from '@/utils/whatsapp/service/whatsapp.service'

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
  return getWhatsAppCampaignLocksService(user.id)
})

export const releaseWhatsAppCampaign = createServerFn({ method: 'POST' })
  .inputValidator(sendWhatsAppCampaignSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    await releaseWhatsAppCampaignService(data, user.id)
  })
