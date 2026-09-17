import { createServerFn } from '@tanstack/react-start'
import {
  checkInvitationByEmailService,
  createInvitationService,
  deleteInvitationService,
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
  .validator(createInvitationSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return createInvitationService(data, user.id)
  })

export const checkInvitationByEmail = createServerFn({ method: 'GET' })
  .validator(checkInvitationByEmailSchema)
  .handler(async ({ data }) => {
    return checkInvitationByEmailService(data)
  })

export const getInvitationByToken = createServerFn({ method: 'GET' })
  .validator(getInvitationByTokenSchema)
  .handler(async ({ data }) => {
    return getInvitationByTokenService(data)
  })

export const getInvitations = createServerFn({ method: 'POST' }).handler(
  async () => {
    const user = await getCurrentUser()
    return getInvitationsService(user.id)
  },
)

export const revokeInvitation = createServerFn({ method: 'POST' })
  .validator(revokeInvitationSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return revokeInvitationService(data, user.id)
  })

export const deleteInvitation = createServerFn({ method: 'POST' })
  .validator(deleteInvitationSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return deleteInvitationService(data, user.id)
  })

export const resendInvitation = createServerFn({ method: 'POST' })
  .validator(resendInvitationSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return resendInvitationService(data, user.id)
  })
