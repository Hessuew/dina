import type { PostNotificationGroup } from '@/utils/post/postNotifications'
import { cn } from '@/lib/utils'

export function buildGroupTitle(group: PostNotificationGroup): string {
  if (group.event === 'comment_created') {
    const n = group.unreadCount
    if (n === 1) return 'New comment on your post'
    return `${n} new comments on your post`
  }

  if (group.courseId) {
    return `New post in ${group.courseTitle ?? 'Course'}`
  }

  return 'New post in General'
}

export function buildGroupSubtitle(group: PostNotificationGroup): string {
  if (group.event === 'comment_created') {
    return group.postExcerpt
  }

  return `${group.postAuthorName} · ${group.postExcerpt}`
}

export type NotificationRowSearch =
  | { channel: string; focusPostId: string }
  | { focusPostId: string }

export type NotificationRowViewModel = {
  isUnread: boolean
  search: NotificationRowSearch
  title: string
  subtitle: string
  buttonTheme: 'dark' | 'lightGhost'
  rowClassName: string
  titleClassName: string
  unreadBadgeClassName: string
  subtitleClassName: string
  timeClassName: string
  markReadButtonClassName: string
}

export function buildNotificationRowViewModel(
  group: PostNotificationGroup,
  isDark: boolean,
): NotificationRowViewModel {
  const isUnread = group.unreadCount > 0
  const search: NotificationRowSearch = group.courseId
    ? { channel: group.courseId, focusPostId: group.postId }
    : { focusPostId: group.postId }

  return {
    isUnread,
    search,
    title: buildGroupTitle(group),
    subtitle: buildGroupSubtitle(group),
    buttonTheme: isDark ? 'dark' : 'lightGhost',
    rowClassName: cn(
      'mx-0 flex items-start gap-3 rounded-none px-3 py-3 transition-all',
      isDark
        ? 'text-[#D6CCBE] hover:bg-white/8 hover:text-[#F8F4EC] focus:bg-white/8 focus:text-[#F8F4EC]'
        : 'text-[#4E463D] hover:bg-[#EDE8DE] hover:text-[#1C1815] focus:bg-[#EDE8DE] focus:text-[#1C1815]',
      isUnread ? 'opacity-100' : 'opacity-60',
    ),
    titleClassName: cn(
      'text-sm font-medium',
      isDark ? 'text-[#F8F4EC]' : 'text-[#1C1815]',
    ),
    unreadBadgeClassName: cn(
      'inline-flex h-5 items-center rounded-none px-1.5 text-[0.68rem] font-medium',
      isDark
        ? 'bg-[#C5A059]/18 text-[#E9D9B4]'
        : 'bg-[#9B7A41]/14 text-[#9B7A41]',
    ),
    subtitleClassName: cn(
      'text-xs leading-relaxed',
      isDark ? 'text-[#8E816D]' : 'text-[#5E5549]',
    ),
    timeClassName: cn(
      'text-[0.68rem]',
      isDark ? 'text-[#AFA28F]' : 'text-[#8E816D]',
    ),
    markReadButtonClassName: cn(
      'mt-0.5 size-8 rounded-none border-none bg-transparent shadow-none hover:translate-y-0',
      isDark
        ? 'text-[#8E816D] hover:bg-white/8 hover:text-[#C5A059]'
        : 'text-[#8E816D] hover:bg-black/5 hover:text-[#9B7A41]',
    ),
  }
}
