import { createServerFn } from '@tanstack/react-start'
import {
  checkInvitationByEmailService,
  createInvitationService,
  deleteInvitationService,
  getInvitationByEmailService,
  getInvitationByTokenService,
  getInvitationsService,
  resendInvitationService,
  revokeInvitationService,
} from '@/utils/invitation/service/invitations.service'
import { getCurrentUser } from '@/utils/auth/auth'
import {
  checkInvitationByEmailSchema,
  createInvitationSchema,
  deleteInvitationSchema,
  getInvitationByTokenSchema,
  resendInvitationSchema,
  revokeInvitationSchema,
} from '@/schemas/invitation.schema'

export const createInvitation = createServerFn({ method: 'POST' })
  .inputValidator(createInvitationSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return createInvitationService(data, user.id)
  })

export const checkInvitationByEmail = createServerFn({ method: 'GET' })
  .inputValidator(checkInvitationByEmailSchema)
  .handler(async ({ data }) => {
    return checkInvitationByEmailService(data)
  })

export const getInvitationByToken = createServerFn({ method: 'GET' })
  .inputValidator(getInvitationByTokenSchema)
  .handler(async ({ data }) => {
    return getInvitationByTokenService(data)
  })

export const getInvitations = createServerFn({ method: 'POST' }).handler(async () => {
  const user = await getCurrentUser()
  return getInvitationsService(user.id)
})

export const getInvitationByEmail = createServerFn({ method: 'GET' })
  .inputValidator(checkInvitationByEmailSchema)
  .handler(async ({ data }) => {
    return getInvitationByEmailService(data)
  })

export const revokeInvitation = createServerFn({ method: 'POST' })
  .inputValidator(revokeInvitationSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return revokeInvitationService(data, user.id)
  })

export const deleteInvitation = createServerFn({ method: 'POST' })
  .inputValidator(deleteInvitationSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return deleteInvitationService(data, user.id)
  })

export const resendInvitation = createServerFn({ method: 'POST' })
  .inputValidator(resendInvitationSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return resendInvitationService(data, user.id)
  })
