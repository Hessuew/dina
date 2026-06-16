// Pure decision logic for the posts route's "focus post" effects.
//
// The route receives an optional `focusPostId` search param: when a notification
// deep-links to a post, the page must (a) fetch that post if it isn't already in
// the loaded list, and (b) scroll it into view once present. Both effects share
// the same guard logic (channel must be settled, work must not repeat) which is
// extracted here so the effect shells stay orchestration-only.

const focusKeyFor = (focusPostId: string, selectedChannel: string): string =>
  `${focusPostId}:${selectedChannel}`

export type FocusFetchDecision =
  | { fetch: false }
  | { fetch: true; focusKey: string; postId: string }

/**
 * Decide whether the focused post must be fetched. Returns `fetch: false` when
 * there is no focus target, the channel hasn't settled, the post is already
 * loaded, or this exact fetch was already issued.
 */
export function decideFocusFetch(params: {
  focusPostId: string | undefined
  loadedChannel: string
  selectedChannel: string
  loadedPostIds: ReadonlyArray<string>
  lastFetchKey: string | null
}): FocusFetchDecision {
  const {
    focusPostId,
    loadedChannel,
    selectedChannel,
    loadedPostIds,
    lastFetchKey,
  } = params

  if (!focusPostId) return { fetch: false }
  if (loadedChannel !== selectedChannel) return { fetch: false }

  const focusKey = focusKeyFor(focusPostId, selectedChannel)
  if (loadedPostIds.includes(focusPostId)) return { fetch: false }
  if (lastFetchKey === focusKey) return { fetch: false }

  return { fetch: true, focusKey, postId: focusPostId }
}

export type FocusScrollDecision =
  | { scroll: false }
  | { scroll: true; focusKey: string; elementId: string }

/**
 * Decide whether the focused post must be scrolled into view. Returns
 * `scroll: false` when there is no focus target, the channel hasn't settled, or
 * this exact scroll was already performed. The caller still resolves the DOM
 * element and only records the key once the scroll actually happened.
 */
export function decideFocusScroll(params: {
  focusPostId: string | undefined
  loadedChannel: string
  selectedChannel: string
  lastScrollKey: string | null
}): FocusScrollDecision {
  const { focusPostId, loadedChannel, selectedChannel, lastScrollKey } = params

  if (!focusPostId) return { scroll: false }
  if (loadedChannel !== selectedChannel) return { scroll: false }

  const focusKey = focusKeyFor(focusPostId, selectedChannel)
  if (lastScrollKey === focusKey) return { scroll: false }

  return { scroll: true, focusKey, elementId: `post-${focusPostId}` }
}

/**
 * Prepend `post` to the list unless an entry with the same id already exists.
 * Returns the original array reference when nothing changes so React can skip a
 * re-render.
 */
export function prependPostIfAbsent<T extends { id: string }>(
  posts: Array<T>,
  post: T,
): Array<T> {
  if (posts.some((p) => p.id === post.id)) return posts
  return [post, ...posts]
}
