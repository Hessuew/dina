import { describe, expect, it } from 'vitest'

import {
  getCachedResourceCheck,
  getCachedRole,
  setCachedResourceCheck,
  setCachedRole,
  withAuthzCache,
} from './cache'

describe('withAuthzCache', () => {
  it('stores role and resource checks inside a fresh scope', async () => {
    await withAuthzCache(async () => {
      setCachedRole('user-1', 'admin', true)
      setCachedResourceCheck('user-1:edit:course:course-1', false)

      expect(getCachedRole('user-1', 'admin')).toBe(true)
      expect(getCachedResourceCheck('user-1:edit:course:course-1')).toBe(false)
    })
  })

  it('reuses outer maps when nested', async () => {
    await withAuthzCache(async () => {
      setCachedRole('user-1', 'admin', true)

      await withAuthzCache(async () => {
        expect(getCachedRole('user-1', 'admin')).toBe(true)
        setCachedRole('user-1', 'teacher', false)
      })

      expect(getCachedRole('user-1', 'teacher')).toBe(false)
    })
  })

  it('misses reads and ignores writes outside a scope', () => {
    setCachedRole('user-1', 'admin', true)
    setCachedResourceCheck('resource-check', true)

    expect(getCachedRole('user-1', 'admin')).toBeNull()
    expect(getCachedResourceCheck('resource-check')).toBeNull()
  })
})
