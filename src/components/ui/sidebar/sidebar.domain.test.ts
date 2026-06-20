import { describe, expect, it } from 'vitest'
import {
  resolveSidebarCollapsibleState,
  resolveSidebarContainerVariantClassName,
  resolveSidebarGapClassName,
} from '@/components/ui/sidebar/sidebar.domain'

describe('resolveSidebarCollapsibleState', () => {
  it('returns the collapsible mode when collapsed', () => {
    expect(resolveSidebarCollapsibleState('collapsed', 'offcanvas')).toBe(
      'offcanvas',
    )
    expect(resolveSidebarCollapsibleState('collapsed', 'icon')).toBe('icon')
  })

  it('returns an empty string when expanded', () => {
    expect(resolveSidebarCollapsibleState('expanded', 'offcanvas')).toBe('')
    expect(resolveSidebarCollapsibleState('expanded', 'icon')).toBe('')
  })
})

describe('resolveSidebarGapClassName', () => {
  it('uses the padded icon width for floating and inset variants', () => {
    const padded =
      'group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]'
    expect(resolveSidebarGapClassName('floating')).toBe(padded)
    expect(resolveSidebarGapClassName('inset')).toBe(padded)
  })

  it('uses the plain icon width for the default sidebar variant', () => {
    expect(resolveSidebarGapClassName('sidebar')).toBe(
      'group-data-[collapsible=icon]:w-(--sidebar-width-icon)',
    )
  })
})

describe('resolveSidebarContainerVariantClassName', () => {
  it('pads and widens floating and inset variants', () => {
    const padded =
      'p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]'
    expect(resolveSidebarContainerVariantClassName('floating')).toBe(padded)
    expect(resolveSidebarContainerVariantClassName('inset')).toBe(padded)
  })

  it('adds the border for the default sidebar variant', () => {
    expect(resolveSidebarContainerVariantClassName('sidebar')).toBe(
      'group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l',
    )
  })
})
