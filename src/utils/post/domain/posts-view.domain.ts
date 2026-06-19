// Pure view-model logic for the posts route.
//
// The route body derives the active channel/course from the search params, a
// human-readable channel label, the current user's moderation rights, the
// search object for a channel switch, and the post-list mutations the realtime
// handlers apply. Extracting these keeps the component shell orchestration-only.

import type { userRoleEnum } from '@/db/schema'
import type { PostChannel } from './post.domain'

const GENERAL_CHANNEL = 'general'

export type UserRole = (typeof userRoleEnum.enumValues)[number]

export type PostsSearch = { channel?: string; focusPostId?: string }

/** The general channel has no backing course; every other channel id is one. */
export function courseIdForChannel(selectedChannel: string): string | null {
  return selectedChannel === GENERAL_CHANNEL ? null : selectedChannel
}

export type ChannelView = {
  selectedChannel: string
  selectedCourseId: string | null
  channelLabel: string
}

/**
 * Resolve the active channel from the search param (defaulting to `general`),
 * its backing course id, and the header label. Unknown channels render with an
 * empty name suffix rather than failing.
 */
export function resolveChannelView(params: {
  searchChannel: string | undefined
  channels: ReadonlyArray<PostChannel>
}): ChannelView {
  const { searchChannel, channels } = params
  const selectedChannel = searchChannel ?? GENERAL_CHANNEL
  const channelLabel =
    selectedChannel === GENERAL_CHANNEL
      ? 'General channel'
      : `Channel: ${channels.find((c) => c.id === selectedChannel)?.name ?? ''}`

  return {
    selectedChannel,
    selectedCourseId: courseIdForChannel(selectedChannel),
    channelLabel,
  }
}

/** Teachers and admins can moderate posts; students cannot. */
export function canModeratePosts(role: UserRole): boolean {
  return role === 'teacher' || role === 'admin'
}

/**
 * Build the next search object when switching channels: clear the param for the
 * general channel, set it otherwise, and always drop any focused post.
 */
export function nextChannelSearch(
  search: PostsSearch,
  channelId: string,
): PostsSearch {
  return {
    ...search,
    channel: channelId === GENERAL_CHANNEL ? undefined : channelId,
    focusPostId: undefined,
  }
}

/** Replace the post sharing `updated`'s id, leaving the rest untouched. */
export function replacePost<T extends { id: string }>(
  posts: Array<T>,
  updated: T,
): Array<T> {
  return posts.map((p) => (p.id === updated.id ? updated : p))
}

/** Drop the post with the given id. */
export function removePost<T extends { id: string }>(
  posts: Array<T>,
  postId: string,
): Array<T> {
  return posts.filter((p) => p.id !== postId)
}
