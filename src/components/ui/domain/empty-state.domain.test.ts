import { describe, expect, it } from 'vitest'
import {
  buildEmptyStateTextRows,
  getEmptyStateChrome,
} from './empty-state.domain'

const base = {
  showAction: true,
  actionLabel: 'Add',
  hasAction: true,
  variant: 'dark' as const,
  className: undefined,
}

describe('getEmptyStateChrome', () => {
  describe('shouldShowAction', () => {
    it('is true when showAction, actionLabel and hasAction are all set', () => {
      expect(getEmptyStateChrome(base).shouldShowAction).toBe(true)
    })

    it('is false when showAction is false', () => {
      expect(getEmptyStateChrome({ ...base, showAction: false }).shouldShowAction).toBe(false)
    })

    it('is false when actionLabel is missing', () => {
      expect(getEmptyStateChrome({ ...base, actionLabel: undefined }).shouldShowAction).toBe(false)
    })

    it('is false when there is no action handler', () => {
      expect(getEmptyStateChrome({ ...base, hasAction: false }).shouldShowAction).toBe(false)
    })

    it('is always a boolean, never a falsy string', () => {
      expect(getEmptyStateChrome({ ...base, actionLabel: '' }).shouldShowAction).toBe(false)
    })
  })

  describe('buttonTheme', () => {
    it('is dark for the dark variant', () => {
      expect(getEmptyStateChrome({ ...base, variant: 'dark' }).buttonTheme).toBe('dark')
    })

    it('is light for the light variant', () => {
      expect(getEmptyStateChrome({ ...base, variant: 'light' }).buttonTheme).toBe('light')
    })
  })

  describe('wrapperClassName', () => {
    it('uses the dashed bordered box for the light variant', () => {
      const { wrapperClassName } = getEmptyStateChrome({ ...base, variant: 'light' })
      expect(wrapperClassName).toContain('border-dashed')
      expect(wrapperClassName).toContain('p-16')
    })

    it('uses the plain padded box for the dark variant', () => {
      const { wrapperClassName } = getEmptyStateChrome({ ...base, variant: 'dark' })
      expect(wrapperClassName).toContain('py-16')
      expect(wrapperClassName).not.toContain('border-dashed')
    })

    it('appends a caller className', () => {
      const { wrapperClassName } = getEmptyStateChrome({ ...base, className: 'mt-2' })
      expect(wrapperClassName).toContain('mt-2')
    })
  })
})

describe('buildEmptyStateTextRows', () => {
  it('returns no rows when nothing is provided', () => {
    expect(buildEmptyStateTextRows({})).toEqual([])
  })

  it('renders heading as an h3 row', () => {
    const rows = buildEmptyStateTextRows({ heading: 'Empty' })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ key: 'heading', text: 'Empty', element: 'h3' })
  })

  it('renders message and description as p rows', () => {
    const rows = buildEmptyStateTextRows({ message: 'msg', description: 'desc' })
    expect(rows.map((r) => r.key)).toEqual(['message', 'description'])
    expect(rows.every((r) => r.element === 'p')).toBe(true)
  })

  it('keeps heading, message, description order', () => {
    const rows = buildEmptyStateTextRows({
      heading: 'h',
      message: 'm',
      description: 'd',
    })
    expect(rows.map((r) => r.key)).toEqual(['heading', 'message', 'description'])
  })

  it('skips empty strings', () => {
    expect(buildEmptyStateTextRows({ heading: '', message: '', description: '' })).toEqual([])
  })
})
