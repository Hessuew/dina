import { describe, expect, it } from 'vitest'
import { getDashboardAssignmentScope } from './dashboard.domain'

describe('getDashboardAssignmentScope', () => {
  it('uses the catalog for admins so published assignments are visible', () => {
    expect(getDashboardAssignmentScope('admin')).toBe('catalog')
  })

  it('uses the catalog for teachers so published assignments are visible', () => {
    expect(getDashboardAssignmentScope('teacher')).toBe('catalog')
  })
})
