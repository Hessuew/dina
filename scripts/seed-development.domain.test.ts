import { describe, expect, it } from 'vitest'
import {
  DEVELOPMENT_STORAGE_BUCKETS,
  bucketsToEnsure,
  findUserInPage,
  isUserListPageExhausted,
  resolveUserPageScan,
  shouldContinueUserSearch,
} from './seed-development.domain'

describe('findUserInPage', () => {
  it('returns the matching user by email', () => {
    expect(
      findUserInPage([{ email: 'a@x.com' }, { email: 'b@x.com' }], 'b@x.com'),
    ).toEqual({ email: 'b@x.com' })
  })

  it('returns undefined when missing', () => {
    expect(findUserInPage([{ email: 'a@x.com' }], 'nope@x.com')).toBeUndefined()
  })
})

describe('shouldContinueUserSearch', () => {
  it('continues only when the page was full', () => {
    expect(shouldContinueUserSearch(1000)).toBe(true)
    expect(shouldContinueUserSearch(999)).toBe(false)
  })
})

describe('isUserListPageExhausted', () => {
  it('stops after max page', () => {
    expect(isUserListPageExhausted(20)).toBe(false)
    expect(isUserListPageExhausted(21)).toBe(true)
  })
})

describe('resolveUserPageScan', () => {
  it('returns match and stops', () => {
    expect(
      resolveUserPageScan(
        [{ email: 'a@x.com' }, { email: 'b@x.com' }],
        'b@x.com',
      ),
    ).toEqual({ done: true, user: { email: 'b@x.com' } })
  })

  it('stops without match on short page', () => {
    expect(
      resolveUserPageScan([{ email: 'a@x.com' }], 'missing@x.com'),
    ).toEqual({ done: true, user: undefined })
  })

  it('continues when page is full and no match', () => {
    const users = Array.from({ length: 1000 }, (_, i) => ({
      email: `u${i}@x.com`,
    }))
    expect(resolveUserPageScan(users, 'missing@x.com')).toEqual({ done: false })
  })
})

describe('bucketsToEnsure', () => {
  it('splits create vs update from existing ids', () => {
    const plan = bucketsToEnsure(['avatars'], DEVELOPMENT_STORAGE_BUCKETS)
    expect(plan.update.map((b) => b.id)).toEqual(['avatars'])
    expect(plan.create.map((b) => b.id)).toEqual([
      'course-thumbnails',
      'media-library',
    ])
  })

  it('creates all when none exist', () => {
    const plan = bucketsToEnsure([])
    expect(plan.create).toHaveLength(3)
    expect(plan.update).toHaveLength(0)
  })
})
