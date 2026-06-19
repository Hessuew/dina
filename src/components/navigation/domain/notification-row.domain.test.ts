import { describe, expect, it } from 'vitest'

import {
  buildGroupSubtitle,
  buildGroupTitle,
  buildNotificationRowViewModel,
} from './notification-row.domain'
import type { PostNotificationGroup } from '@/utils/post/postNotifications'

function makeGroup(
  overrides: Partial<PostNotificationGroup> = {},
): PostNotificationGroup {
  return {
    event: 'post_created',
    postId: 'post-1',
    courseId: null,
    courseTitle: null,
    postAuthorName: 'Ada',
    postExcerpt: 'Hello world',
    unreadCount: 0,
    lastActivityAt: new Date('2026-06-18T00:00:00Z'),
    ...overrides,
  }
}

describe('buildGroupTitle', () => {
  it('returns singular comment title when one unread comment', () => {
    expect(
      buildGroupTitle(makeGroup({ event: 'comment_created', unreadCount: 1 })),
    ).toBe('New comment on your post')
  })

  it('returns pluralized comment title when multiple unread comments', () => {
    expect(
      buildGroupTitle(makeGroup({ event: 'comment_created', unreadCount: 3 })),
    ).toBe('3 new comments on your post')
  })

  it('returns course title for a course post', () => {
    expect(
      buildGroupTitle(makeGroup({ courseId: 'c1', courseTitle: 'Algebra' })),
    ).toBe('New post in Algebra')
  })

  it('falls back to "Course" when a course post has no title', () => {
    expect(
      buildGroupTitle(makeGroup({ courseId: 'c1', courseTitle: null })),
    ).toBe('New post in Course')
  })

  it('returns the General label for a non-course post', () => {
    expect(buildGroupTitle(makeGroup({ courseId: null }))).toBe(
      'New post in General',
    )
  })
})

describe('buildGroupSubtitle', () => {
  it('returns the excerpt alone for a comment event', () => {
    expect(
      buildGroupSubtitle(
        makeGroup({ event: 'comment_created', postExcerpt: 'Nice point' }),
      ),
    ).toBe('Nice point')
  })

  it('prefixes the author name for a post event', () => {
    expect(
      buildGroupSubtitle(
        makeGroup({ postAuthorName: 'Ada', postExcerpt: 'Hello' }),
      ),
    ).toBe('Ada · Hello')
  })
})

describe('buildNotificationRowViewModel', () => {
  it('marks the row unread when there are unread items', () => {
    const vm = buildNotificationRowViewModel(
      makeGroup({ unreadCount: 2 }),
      false,
    )
    expect(vm.isUnread).toBe(true)
    expect(vm.rowClassName).toContain('opacity-100')
  })

  it('marks the row read and dims it when there are no unread items', () => {
    const vm = buildNotificationRowViewModel(
      makeGroup({ unreadCount: 0 }),
      false,
    )
    expect(vm.isUnread).toBe(false)
    expect(vm.rowClassName).toContain('opacity-60')
  })

  it('builds channel search params for a course post', () => {
    const vm = buildNotificationRowViewModel(
      makeGroup({ courseId: 'c1', postId: 'p9' }),
      false,
    )
    expect(vm.search).toEqual({ channel: 'c1', focusPostId: 'p9' })
  })

  it('builds focus-only search params for a non-course post', () => {
    const vm = buildNotificationRowViewModel(
      makeGroup({ courseId: null, postId: 'p9' }),
      false,
    )
    expect(vm.search).toEqual({ focusPostId: 'p9' })
  })

  it('derives title and subtitle from the group', () => {
    const vm = buildNotificationRowViewModel(
      makeGroup({ postAuthorName: 'Ada', postExcerpt: 'Hi' }),
      false,
    )
    expect(vm.title).toBe('New post in General')
    expect(vm.subtitle).toBe('Ada · Hi')
  })

  it('uses dark styling when isDark is true', () => {
    const vm = buildNotificationRowViewModel(makeGroup(), true)
    expect(vm.buttonTheme).toBe('dark')
    expect(vm.rowClassName).toContain('text-[#D6CCBE]')
    expect(vm.titleClassName).toContain('text-[#F8F4EC]')
    expect(vm.unreadBadgeClassName).toContain('bg-[#C5A059]/18')
    expect(vm.subtitleClassName).toContain('text-[#8E816D]')
    expect(vm.timeClassName).toContain('text-[#AFA28F]')
    expect(vm.markReadButtonClassName).toContain('hover:text-[#C5A059]')
  })

  it('uses light styling when isDark is false', () => {
    const vm = buildNotificationRowViewModel(makeGroup(), false)
    expect(vm.buttonTheme).toBe('lightGhost')
    expect(vm.rowClassName).toContain('text-[#4E463D]')
    expect(vm.titleClassName).toContain('text-[#1C1815]')
    expect(vm.unreadBadgeClassName).toContain('bg-[#9B7A41]/14')
    expect(vm.subtitleClassName).toContain('text-[#5E5549]')
    expect(vm.timeClassName).toContain('text-[#8E816D]')
    expect(vm.markReadButtonClassName).toContain('hover:text-[#9B7A41]')
  })
})
