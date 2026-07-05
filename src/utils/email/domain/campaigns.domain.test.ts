import { describe, expect, it } from 'vitest'
import { resolveEmailCampaign } from './campaigns.domain'

describe('resolveEmailCampaign', () => {
  it('pairs invitation with the invitation email type and approved_not_registered cohort', () => {
    expect(resolveEmailCampaign('invitation')).toEqual({
      emailType: 'invitation',
      cohort: 'approved_not_registered',
    })
  })
})
