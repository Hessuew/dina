import { describe, expect, it } from 'vitest'
import { resolveMenuButtonTooltip } from './sidebar-menu-button.domain'

const collapsedDesktop = { state: 'collapsed' as const, isMobile: false }

describe('resolveMenuButtonTooltip', () => {
  it('returns null when no tooltip is given', () => {
    expect(resolveMenuButtonTooltip(undefined, collapsedDesktop)).toBeNull()
  })

  it('returns null for an empty-string tooltip', () => {
    expect(resolveMenuButtonTooltip('', collapsedDesktop)).toBeNull()
  })

  it('normalizes a string tooltip into children props', () => {
    expect(resolveMenuButtonTooltip('Inbox', collapsedDesktop)).toEqual({
      children: 'Inbox',
      hidden: false,
    })
  })

  it('preserves the props of an object tooltip', () => {
    const result = resolveMenuButtonTooltip(
      { children: 'Inbox', side: 'top' },
      collapsedDesktop,
    )

    expect(result).toEqual({ children: 'Inbox', side: 'top', hidden: false })
  })

  it('shows the tooltip only when collapsed on desktop', () => {
    expect(resolveMenuButtonTooltip('x', { state: 'collapsed', isMobile: false })?.hidden).toBe(
      false,
    )
    expect(resolveMenuButtonTooltip('x', { state: 'expanded', isMobile: false })?.hidden).toBe(true)
    expect(resolveMenuButtonTooltip('x', { state: 'collapsed', isMobile: true })?.hidden).toBe(true)
    expect(resolveMenuButtonTooltip('x', { state: 'expanded', isMobile: true })?.hidden).toBe(true)
  })

  it('lets an object tooltip override the computed hidden value', () => {
    const result = resolveMenuButtonTooltip(
      { children: 'Inbox', hidden: false },
      { state: 'expanded', isMobile: false },
    )

    expect(result?.hidden).toBe(false)
  })
})
