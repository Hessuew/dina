import { describe, expect, it } from 'vitest'
import { buildUserTextView } from '../nav-user/nav-user.domain'

describe('buildUserTextView', () => {
  it('compact + dark uses compact container and omits name size/color', () => {
    const view = buildUserTextView({
      user: { email: 'a@b.com', fullName: 'Ada Byron' },
      isDark: true,
      compact: true,
    })

    expect(view.displayName).toBe('Ada Byron')
    expect(view.email).toBe('a@b.com')
    expect(view.containerClassName).toContain('text-sm leading-tight')
    // not-compact name extras are absent
    expect(view.nameClassName).toBe('truncate font-medium')
    expect(view.emailClassName).toContain('text-[#8E816D]')
  })

  it('non-compact + dark adds name size and dark name colour', () => {
    const view = buildUserTextView({
      user: { email: 'a@b.com', fullName: 'Ada Byron' },
      isDark: true,
      compact: false,
    })

    expect(view.containerClassName).toContain('leading-tight')
    expect(view.containerClassName).not.toContain('text-sm leading-tight')
    expect(view.nameClassName).toContain('text-sm')
    expect(view.nameClassName).toContain('text-[#F8F4EC]')
    expect(view.emailClassName).toContain('text-[#8E816D]')
  })

  it('non-compact + light uses light colours and falls back to email name', () => {
    const view = buildUserTextView({
      user: { email: 'a@b.com' },
      isDark: false,
      compact: false,
    })

    expect(view.displayName).toBe('a@b.com')
    expect(view.nameClassName).toContain('text-[#1C1815]')
    expect(view.emailClassName).toContain('text-[#5E5549]')
  })
})
