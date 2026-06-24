import { describe, expect, it } from 'vitest'

import {
  buildNotificationMenuHeaderViewModel,
  buildNotificationTriggerViewModel,
} from './notifications-menu.domain'

describe('buildNotificationTriggerViewModel', () => {
  it('shows the badge only when there is something to animate', () => {
    expect(
      buildNotificationTriggerViewModel(false, false, true).showBadge,
    ).toBe(true)
    expect(
      buildNotificationTriggerViewModel(false, false, false).showBadge,
    ).toBe(false)
  })

  it('uses the destructive icon colour when animating, regardless of theme', () => {
    expect(
      buildNotificationTriggerViewModel(true, false, true).iconClassName,
    ).toContain('text-destructive')
    expect(
      buildNotificationTriggerViewModel(false, false, true).iconClassName,
    ).toContain('text-destructive')
  })

  it('uses dark icon colour when not animating and dark', () => {
    const vm = buildNotificationTriggerViewModel(true, false, false)
    expect(vm.iconClassName).toContain('text-[#C5A059]')
    expect(vm.buttonClassName).toContain('text-[#AFA28F]')
  })

  it('uses light icon colour when not animating and light', () => {
    const vm = buildNotificationTriggerViewModel(false, false, false)
    expect(vm.iconClassName).toContain('text-[#9B7A41]')
    expect(vm.buttonClassName).toContain('text-[#4E463D]')
  })

  it('hides the badge position when collapsed and shows it when expanded', () => {
    expect(
      buildNotificationTriggerViewModel(false, true, true).badgeClassName,
    ).toContain('hidden')
    expect(
      buildNotificationTriggerViewModel(false, false, true).badgeClassName,
    ).toContain('right-2')
  })

  it('themes the badge background text by mode', () => {
    expect(
      buildNotificationTriggerViewModel(true, false, true).badgeClassName,
    ).toContain('text-[#E9D9B4]')
    expect(
      buildNotificationTriggerViewModel(false, false, true).badgeClassName,
    ).toContain('text-[#9B7A41]')
  })
})

describe('buildNotificationMenuHeaderViewModel', () => {
  it('shows the unread count when animating', () => {
    const vm = buildNotificationMenuHeaderViewModel(false, true, 3)
    expect(vm.subtitleText).toBe('3 unread')
    expect(vm.markAllDisabled).toBe(false)
  })

  it('shows the caught-up label and disables mark-all when not animating', () => {
    const vm = buildNotificationMenuHeaderViewModel(false, false, 0)
    expect(vm.subtitleText).toBe('All caught up')
    expect(vm.markAllDisabled).toBe(true)
  })

  it('uses dark styling when dark', () => {
    const vm = buildNotificationMenuHeaderViewModel(true, true, 1)
    expect(vm.eyebrowClassName).toContain('text-[#C5A059]')
    expect(vm.subtitleClassName).toContain('text-[#8E816D]')
    expect(vm.markAllButtonClassName).toContain('hover:text-[#D6B16E]')
    expect(vm.dividerClassName).toContain('border-white/8')
  })

  it('uses light styling when light', () => {
    const vm = buildNotificationMenuHeaderViewModel(false, true, 1)
    expect(vm.eyebrowClassName).toContain('text-[#9B7A41]')
    expect(vm.subtitleClassName).toContain('text-[#5E5549]')
    expect(vm.markAllButtonClassName).toContain('hover:text-[#1C1815]')
    expect(vm.dividerClassName).toContain('border-[#1A1A1A]/10')
  })
})
