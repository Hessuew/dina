import { describe, expect, it } from 'vitest'

import { buildUserContext, isAuthenticatedUser } from './user-context.domain'

describe('isAuthenticatedUser', () => {
  it('returns false for null', () => {
    expect(isAuthenticatedUser(null)).toBe(false)
  })

  it('returns false when email is missing', () => {
    expect(isAuthenticatedUser({ id: 'u1' })).toBe(false)
  })

  it('returns false when email is null', () => {
    expect(isAuthenticatedUser({ id: 'u1', email: null })).toBe(false)
  })

  it('returns false when email is an empty string', () => {
    expect(isAuthenticatedUser({ id: 'u1', email: '' })).toBe(false)
  })

  it('returns true when id and email are present', () => {
    expect(isAuthenticatedUser({ id: 'u1', email: 'a@b.com' })).toBe(true)
  })
})

describe('buildUserContext', () => {
  const authUser = { id: 'u1', email: 'a@b.com' }

  it('maps all profile fields when a profile is present', () => {
    expect(
      buildUserContext(authUser, {
        avatarUrl: 'https://img/a.png',
        bio: 'hello',
        fullName: 'Ada Lovelace',
        role: 'teacher',
      }),
    ).toEqual({
      avatarUrl: 'https://img/a.png',
      bio: 'hello',
      email: 'a@b.com',
      id: 'u1',
      fullName: 'Ada Lovelace',
      role: 'teacher',
    })
  })

  it('defaults role to "student" when the profile role is missing', () => {
    expect(buildUserContext(authUser, undefined).role).toBe('student')
  })

  it('passes through null profile fields when profile is absent', () => {
    const ctx = buildUserContext(authUser, undefined)
    expect(ctx.avatarUrl).toBeUndefined()
    expect(ctx.bio).toBeUndefined()
    expect(ctx.fullName).toBeUndefined()
    expect(ctx.email).toBe('a@b.com')
    expect(ctx.id).toBe('u1')
  })

  it('keeps the auth user identity even when a profile exists', () => {
    const ctx = buildUserContext(authUser, {
      avatarUrl: null,
      bio: null,
      fullName: 'Grace Hopper',
      role: 'admin',
    })
    expect(ctx.id).toBe('u1')
    expect(ctx.email).toBe('a@b.com')
    expect(ctx.avatarUrl).toBeNull()
    expect(ctx.bio).toBeNull()
  })
})
