import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import {
  Loader2,
  MessageCircle,
  SendIcon,
  SmilePlus,
  XIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import type { CommentWithAuthor, PostWithDetails } from '@/domain'
import { Button } from '@/components/ui/button'
import { PageLayout } from '@/components/layout/page-layout'
import {
  DeleteActionButton2,
  EditActionButton,
} from '@/components/layout/entity-header-actions'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useMutation } from '@/hooks/useMutation'
import { cn } from '@/lib/utils'
import { REACTION_EMOJIS } from '@/schemas/post.schema'
import { getCurrentUser, getUserProfile } from '@/utils/auth/auth'
import {
  createComment,
  createPost,
  deleteComment,
  deletePost,
  getComments,
  getPostById,
  getPostChannels,
  getPosts,
  toggleCommentReaction,
  toggleReaction,
  updateComment,
  updatePost,
} from '@/utils/post/posts'

const fetchCurrentUser = createServerFn({ method: 'POST' }).handler(
  async () => {
    const user = await getCurrentUser()
    const profile = await getUserProfile(user.id)
    return {
      id: user.id,
      fullName: profile.fullName,
      avatarUrl: profile.avatarUrl,
      role: profile.role,
    }
  },
)

export const Route = createFileRoute('/_authed/posts')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { channel?: string; focusPostId?: string } => {
    return {
      channel: typeof search.channel === 'string' ? search.channel : undefined,
      focusPostId:
        typeof search.focusPostId === 'string' ? search.focusPostId : undefined,
    }
  },
  loader: async () => {
    const [channelsData, postsData, currentUser] = await Promise.all([
      getPostChannels(),
      getPosts({ data: { limit: 10, courseId: null } }),
      fetchCurrentUser(),
    ])
    return {
      posts: postsData.posts,
      nextCursor: postsData.nextCursor,
      currentUser,
      channels: channelsData.channels,
    }
  },
  component: PostsComponent,
})

// ── Main Component ────────────────────────────────────────────────────────

function PostsComponent() {
  const loaderData = Route.useLoaderData()
  const navigate = Route.useNavigate()
  const search = Route.useSearch()
  const { currentUser } = loaderData

  const channels = loaderData.channels
  const selectedChannel = search.channel ?? 'general'
  const selectedCourseId =
    selectedChannel === 'general' ? null : selectedChannel

  const focusPostId = search.focusPostId

  const [allPosts, setAllPosts] = useState<Array<PostWithDetails>>(
    loaderData.posts,
  )
  const [nextCursor, setNextCursor] = useState(loaderData.nextCursor)
  const [loadingMore, setLoadingMore] = useState(false)
  const latestChannelRequestId = useRef<number>(0)
  const loadedChannelRef = useRef<string>('general')
  const focusFetchKeyRef = useRef<string | null>(null)
  const focusScrollKeyRef = useRef<string | null>(null)

  const canModerate =
    currentUser.role === 'teacher' || currentUser.role === 'admin'

  const handleLoadMore = async () => {
    if (!nextCursor) return
    setLoadingMore(true)
    try {
      const data = await getPosts({
        data: { limit: 10, cursor: nextCursor, courseId: selectedCourseId },
      })
      setAllPosts((prev) => [...prev, ...data.posts])
      setNextCursor(data.nextCursor)
    } finally {
      setLoadingMore(false)
    }
  }

  const handleSelectChannel = async (channelId: string) => {
    await navigate({
      search: {
        ...search,
        channel: channelId === 'general' ? undefined : channelId,
        focusPostId: undefined,
      },
      replace: false,
    })
  }

  useEffect(() => {
    if (selectedChannel === loadedChannelRef.current) return

    const requestId = ++latestChannelRequestId.current
    setLoadingMore(true)

    const courseId = selectedChannel === 'general' ? null : selectedChannel
    getPosts({ data: { limit: 10, courseId } })
      .then((data) => {
        if (latestChannelRequestId.current !== requestId) return
        setAllPosts(data.posts)
        setNextCursor(data.nextCursor)
        loadedChannelRef.current = selectedChannel
      })
      .catch(() => {
        if (latestChannelRequestId.current !== requestId) return
        toast.error('Failed to load posts')
      })
      .finally(() => {
        if (latestChannelRequestId.current !== requestId) return
        setLoadingMore(false)
      })
  }, [selectedChannel])

  useEffect(() => {
    if (!focusPostId) return
    if (loadedChannelRef.current !== selectedChannel) return

    const focusKey = `${focusPostId}:${selectedChannel}`
    if (allPosts.some((p) => p.id === focusPostId)) return
    if (focusFetchKeyRef.current === focusKey) return

    focusFetchKeyRef.current = focusKey
    getPostById({ data: { postId: focusPostId } })
      .then((res) => {
        setAllPosts((prev) => {
          if (prev.some((p) => p.id === res.post.id)) return prev
          return [res.post, ...prev]
        })
      })
      .catch(() => {})
  }, [allPosts, focusPostId, selectedChannel])

  useEffect(() => {
    if (!focusPostId) return
    if (loadedChannelRef.current !== selectedChannel) return

    const focusKey = `${focusPostId}:${selectedChannel}`
    if (focusScrollKeyRef.current === focusKey) return

    const el = document.getElementById(`post-${focusPostId}`)
    if (!el) return

    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    focusScrollKeyRef.current = focusKey
  }, [allPosts, focusPostId, selectedChannel])

  const handlePostCreated = (post: PostWithDetails) => {
    setAllPosts((prev) => [post, ...prev])
  }

  const handlePostUpdated = (updated: PostWithDetails) => {
    setAllPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
  }

  const handlePostDeleted = (postId: string) => {
    setAllPosts((prev) => prev.filter((p) => p.id !== postId))
  }

  return (
    <PageLayout>
      <div className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start">
        {/* Channels */}
        <div className="hidden self-start lg:sticky lg:top-10 lg:block">
          <div className="border border-[#1A1A1A]/10 bg-white/60 p-5 shadow-[0_22px_44px_-28px_rgba(0,0,0,0.08)]">
            <div className="h-px w-8 bg-[#9B7A41]/50" />
            <div className="mt-2 text-[0.68rem] font-medium tracking-[0.3em] text-[#9B7A41] uppercase">
              Channels
            </div>
            <div className="mt-4 flex flex-col gap-1.5">
              {channels.map((ch) => (
                <Button
                  key={ch.id}
                  type="button"
                  variant="ghost"
                  theme="lightGhost"
                  onClick={() => handleSelectChannel(ch.id)}
                  className={cn(
                    'flex h-9 w-full cursor-pointer items-center justify-between border px-3 py-2 text-left shadow-none transition-all hover:translate-y-0',
                    ch.id === selectedChannel
                      ? 'border-[#C5A059]/42 bg-white/70 hover:border-[#C5A059]/60'
                      : 'border-[#1A1A1A]/10 bg-white/40 hover:border-[#C5A059]/30',
                  )}
                >
                  <span className="text-sm text-[#1C1815]">{ch.name}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="min-w-0">
          {/* Header */}
          <div className="mb-8">
            <div className="h-px w-8 bg-[#9B7A41]/50" />
            <div className="mt-2 text-[0.68rem] font-medium tracking-[0.3em] text-[#9B7A41] uppercase">
              Community
            </div>
            <h1 className="mt-1 font-serif text-3xl tracking-[-0.02em] text-[#1C1815] sm:text-4xl">
              Posts
            </h1>
            <p className="mt-2 text-sm text-[#5E5549]">
              {selectedChannel === 'general'
                ? 'General channel'
                : `Channel: ${channels.find((c) => c.id === selectedChannel)?.name ?? ''}`}
            </p>
          </div>

          <PostComposer
            currentUser={currentUser}
            courseId={selectedCourseId}
            onCreated={handlePostCreated}
          />

          <div className="mt-8 flex flex-col gap-6">
            {allPosts.length === 0 ? (
              <div className="border border-dashed border-[#1A1A1A]/20 bg-[#EDE8DE]/40 p-16 text-center">
                <MessageCircle className="mx-auto mb-3 size-8 text-[#9B7A41]/50" />
                <h3 className="font-serif text-lg text-[#1C1815]">
                  No posts yet
                </h3>
                <p className="mt-2 text-sm text-[#5E5549]">
                  Be the first to share something with the community
                </p>
              </div>
            ) : (
              allPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUser={currentUser}
                  canModerate={canModerate}
                  onUpdated={handlePostUpdated}
                  onDeleted={handlePostDeleted}
                />
              ))
            )}
          </div>

          {/* Load more */}
          {nextCursor && (
            <div className="mt-8 text-center">
              <Button
                theme="light"
                variant="outline"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Loading…
                  </>
                ) : (
                  'Load more'
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  )
}

// ── Composer ───────────────────────────────────────────────────────────────

type CurrentUser = {
  id: string
  fullName: string
  avatarUrl: string | null
  role: 'student' | 'teacher' | 'admin'
}

function PostComposer({
  currentUser,
  courseId,
  onCreated,
}: {
  currentUser: CurrentUser
  courseId: string | null
  onCreated: (post: PostWithDetails) => void
}) {
  const [content, setContent] = useState('')

  const mutation = useMutation({
    fn: createPost,
    onSuccess: ({ data }) => {
      onCreated(data.post)
      setContent('')
      toast.success('Post created')
    },
  })

  const handleSubmit = () => {
    const trimmed = content.trim()
    if (!trimmed) return
    mutation.mutate({ data: { content: trimmed, courseId } })
  }

  const initials = currentUser.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="border border-[#1A1A1A]/10 bg-white/60 p-5 shadow-[0_22px_44px_-28px_rgba(0,0,0,0.08)]">
      <div className="flex gap-3">
        {currentUser.avatarUrl ? (
          <img
            src={currentUser.avatarUrl}
            alt={currentUser.fullName}
            className="size-9 shrink-0 border border-[#1A1A1A]/10 object-cover"
          />
        ) : (
          <div className="flex size-9 shrink-0 items-center justify-center border border-[#C5A059]/30 bg-[#1C1A17] text-[0.55rem] font-medium text-[#E9D9B4]">
            {initials}
          </div>
        )}
        <div className="flex-1">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share something with the community…"
            rows={3}
            className="border-[#1A1A1A]/10 bg-transparent text-sm text-[#1C1815] placeholder:text-[#8E816D] focus:border-[#C5A059]/40 focus-visible:ring-0"
          />
          <div className="mt-3 flex justify-end">
            <Button
              theme="light"
              size="sm"
              onClick={handleSubmit}
              disabled={!content.trim() || mutation.isPending}
            >
              {mutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <SendIcon className="size-3.5" />
              )}
              Post
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Post Card ─────────────────────────────────────────────────────────────

function PostCard({
  post,
  currentUser,
  canModerate,
  onUpdated,
  onDeleted,
}: {
  post: PostWithDetails
  currentUser: CurrentUser
  canModerate: boolean
  onUpdated: (post: PostWithDetails) => void
  onDeleted: (postId: string) => void
}) {
  const isAuthor = post.author.id === currentUser.id
  const canDelete = isAuthor || canModerate
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(post.content)

  // Local reactions state
  const [reactions, setReactions] = useState(post.reactions)
  const [commentCount, setCommentCount] = useState(post.commentCount)
  const [previewComments, setPreviewComments] = useState(post.previewComments)
  const [showAllComments, setShowAllComments] = useState(false)
  const [allComments, setAllComments] = useState<Array<CommentWithAuthor>>([])
  const [commentsNextCursor, setCommentsNextCursor] = useState<
    { createdAt: string; id: string } | undefined
  >()
  const [loadingComments, setLoadingComments] = useState(false)

  const isEdited =
    new Date(post.updatedAt).getTime() - new Date(post.createdAt).getTime() >
    1000

  const updateMutation = useMutation({
    fn: updatePost,
    onSuccess: () => {
      onUpdated({
        ...post,
        content: editContent,
        updatedAt: new Date(),
        reactions,
        commentCount,
        previewComments,
      })
      setIsEditing(false)
      toast.success('Post updated')
    },
  })

  const deleteMutation = useMutation({
    fn: deletePost,
    onSuccess: () => {
      onDeleted(post.id)
      toast.success('Post deleted')
    },
  })

  const reactionMutation = useMutation({
    fn: toggleReaction,
  })

  const handleReaction = (emoji: string) => {
    const existing = reactions.find((r) => r.userId === currentUser.id)

    // Optimistic update
    if (existing && existing.emoji === emoji) {
      setReactions((prev) => prev.filter((r) => r.id !== existing.id))
    } else if (existing) {
      setReactions((prev) =>
        prev.map((r) => (r.id === existing.id ? { ...r, emoji } : r)),
      )
    } else {
      setReactions((prev) => [
        ...prev,
        { id: `temp-${Date.now()}`, emoji, userId: currentUser.id },
      ])
    }

    reactionMutation.mutate({ data: { postId: post.id, emoji } })
  }

  const handleLoadAllComments = async () => {
    setLoadingComments(true)
    try {
      const data = await getComments({
        data: { postId: post.id, limit: 20 },
      })
      setAllComments(data.comments)
      setCommentsNextCursor(data.nextCursor)
      setShowAllComments(true)
    } finally {
      setLoadingComments(false)
    }
  }

  const handleLoadMoreComments = async () => {
    if (!commentsNextCursor) return
    setLoadingComments(true)
    try {
      const data = await getComments({
        data: { postId: post.id, limit: 20, cursor: commentsNextCursor },
      })
      setAllComments((prev) => [...prev, ...data.comments])
      setCommentsNextCursor(data.nextCursor)
    } finally {
      setLoadingComments(false)
    }
  }

  const handleCommentCreated = (comment: CommentWithAuthor) => {
    setCommentCount((c) => c + 1)
    if (showAllComments) {
      setAllComments((prev) => [...prev, comment])
    } else {
      setPreviewComments((prev) => [...prev.slice(-2), comment])
    }
  }

  const handleCommentDeleted = (commentId: string) => {
    setCommentCount((c) => c - 1)
    if (showAllComments) {
      setAllComments((prev) => prev.filter((c) => c.id !== commentId))
    } else {
      setPreviewComments((prev) => prev.filter((c) => c.id !== commentId))
    }
  }

  const handleCommentUpdated = (updated: CommentWithAuthor) => {
    if (showAllComments) {
      setAllComments((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c)),
      )
    } else {
      setPreviewComments((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c)),
      )
    }
  }

  const initials = post.author.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  // Group reactions by emoji for display
  const reactionGroups = reactions.reduce<Record<string, Array<string>>>(
    (acc, r) => {
      acc[r.emoji] ??= []
      acc[r.emoji].push(r.userId)
      return acc
    },
    {},
  )

  const userReactionEmoji = reactions.find(
    (r) => r.userId === currentUser.id,
  )?.emoji

  const displayedComments = showAllComments ? allComments : previewComments

  return (
    <div
      id={`post-${post.id}`}
      className="border border-[#1A1A1A]/10 bg-white/60 shadow-[0_22px_44px_-28px_rgba(0,0,0,0.08)]"
    >
      {/* Post header */}
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-10 w-10 shrink-0 overflow-hidden rounded-none bg-[#EDE8DE]">
            {post.author.avatarUrl ? (
              <img
                src={post.author.avatarUrl}
                alt={post.author.fullName}
                className="flex-1 shrink-0 border border-[#1A1A1A]/10 object-cover"
              />
            ) : (
              <div className="flex size-10 shrink-0 items-center justify-center border border-[#C5A059]/30 bg-[#1C1A17] text-[0.55rem] font-medium text-[#E9D9B4]">
                {initials}
              </div>
            )}
          </div>
          <div>
            <span className="text-sm font-medium text-[#1C1815]">
              {post.author.fullName}
            </span>
            <div className="flex items-center gap-1.5 text-[0.68rem] text-[#8E816D]">
              {formatDistanceToNow(new Date(post.createdAt), {
                addSuffix: true,
              })}
              {isEdited && <span className="text-[#AFA28F]">· edited</span>}
            </div>
          </div>
        </div>

        {(isAuthor || canDelete) && (
          <div className="flex items-center gap-1">
            {isAuthor && (
              <EditActionButton
                onClick={() => {
                  setEditContent(post.content)
                  setIsEditing(true)
                }}
                theme="lightGhost"
                size="md"
              />
            )}
            {canDelete && (
              <DeleteActionButton2
                onClick={() =>
                  deleteMutation.mutate({ data: { postId: post.id } })
                }
                theme="lightGhost"
                size="md"
              />
            )}
          </div>
        )}
      </div>

      {/* Post content */}
      <div className="px-5 pt-3 pb-4">
        {isEditing ? (
          <div className="flex flex-col gap-3">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={3}
              className="border-[#1A1A1A]/10 bg-transparent text-sm text-[#1C1815] focus:border-[#C5A059]/40 focus-visible:ring-0"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                theme="light"
                size="sm"
                onClick={() => setIsEditing(false)}
              >
                <XIcon className="size-3.5" />
                Cancel
              </Button>
              <Button
                theme="light"
                size="sm"
                onClick={() =>
                  updateMutation.mutate({
                    data: { postId: post.id, content: editContent.trim() },
                  })
                }
                disabled={!editContent.trim() || updateMutation.isPending}
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-[#4E463D]">
            {post.content}
          </p>
        )}
      </div>

      {/* Reactions bar */}
      <div className="border-t border-[#1A1A1A]/8 px-5 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {Object.entries(reactionGroups).map(([emoji, userIds]) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleReaction(emoji)}
              className={cn(
                'inline-flex items-center gap-1 border px-2 py-0.5 text-xs transition-colors',
                userIds.includes(currentUser.id)
                  ? 'border-[#C5A059]/40 bg-[#C5A059]/10 text-[#9B7A41]'
                  : 'border-[#1A1A1A]/10 text-[#8E816D] hover:border-[#C5A059]/30',
              )}
            >
              <span>{emoji}</span>
              <span className="text-[0.65rem] font-medium">
                {userIds.length}
              </span>
            </button>
          ))}

          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                theme="lightGhost"
                className={cn(
                  'size-8 rounded-none border-none bg-transparent text-[#8E816D] shadow-none hover:translate-y-0 hover:bg-black/5 hover:text-[#1C1815]',
                  userReactionEmoji ? 'text-[#9B7A41]' : undefined,
                )}
              >
                <SmilePlus className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-auto p-2">
              <div className="flex gap-0.5">
                {REACTION_EMOJIS.map((emoji) => (
                  <DropdownMenuItem
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className={cn(
                      'flex size-8 cursor-pointer items-center justify-center p-0',
                      userReactionEmoji === emoji
                        ? 'bg-[#C5A059]/10 text-[#9B7A41]'
                        : 'text-[#1C1815]',
                    )}
                  >
                    <span className="text-base leading-none">{emoji}</span>
                  </DropdownMenuItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Comments section */}
      <div className="border-t border-[#1A1A1A]/8 px-5 py-3">
        {/* Comment count + view all toggle */}
        {commentCount > 0 && (
          <div className="mb-3 flex items-center gap-2">
            <MessageCircle className="size-3.5 text-[#8E816D]" />
            <span className="text-[0.68rem] font-medium tracking-widest text-[#8E816D] uppercase">
              {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
            </span>
            {!showAllComments && commentCount > 3 && (
              <button
                type="button"
                onClick={handleLoadAllComments}
                className="ml-auto text-[0.68rem] font-medium text-[#9B7A41] hover:text-[#C5A059]"
                disabled={loadingComments}
              >
                {loadingComments ? 'Loading…' : 'View all'}
              </button>
            )}
          </div>
        )}

        {/* Comments list */}
        {displayedComments.length > 0 && (
          <div className="mb-3 flex flex-col gap-2">
            {displayedComments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUser={currentUser}
                canModerate={canModerate}
                onDeleted={handleCommentDeleted}
                onUpdated={handleCommentUpdated}
              />
            ))}
          </div>
        )}

        {/* Load more comments */}
        {showAllComments && commentsNextCursor && (
          <button
            type="button"
            onClick={handleLoadMoreComments}
            className="mb-4 text-[0.72rem] font-medium text-[#9B7A41] hover:text-[#C5A059]"
            disabled={loadingComments}
          >
            {loadingComments ? 'Loading…' : 'Load more comments'}
          </button>
        )}

        {/* Comment composer */}
        <CommentComposer
          postId={post.id}
          currentUser={currentUser}
          onCreated={handleCommentCreated}
        />
      </div>
    </div>
  )
}

// ── Comment Item ──────────────────────────────────────────────────────────

function CommentItem({
  comment,
  currentUser,
  canModerate,
  onDeleted,
  onUpdated,
}: {
  comment: CommentWithAuthor
  currentUser: CurrentUser
  canModerate: boolean
  onDeleted: (id: string) => void
  onUpdated: (comment: CommentWithAuthor) => void
}) {
  const isAuthor = comment.author.id === currentUser.id
  const canDelete = isAuthor || canModerate
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)

  const isEdited =
    new Date(comment.updatedAt).getTime() -
      new Date(comment.createdAt).getTime() >
    1000

  const initials = comment.author.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const editMutation = useMutation({
    fn: updateComment,
    onSuccess: () => {
      onUpdated({ ...comment, content: editContent, updatedAt: new Date() })
      setIsEditing(false)
      toast.success('Comment updated')
    },
  })

  const deleteMutation = useMutation({
    fn: deleteComment,
    onSuccess: () => {
      onDeleted(comment.id)
      toast.success('Comment deleted')
    },
  })

  const commentReactionMutation = useMutation({
    fn: toggleCommentReaction,
  })

  const [commentReactions, setCommentReactions] = useState(comment.reactions)

  const commentReactionGroups = commentReactions.reduce<
    Record<string, Array<string>>
  >((acc, r) => {
    acc[r.emoji] ??= []
    acc[r.emoji].push(r.userId)
    return acc
  }, {})

  const userCommentReactionEmoji = commentReactions.find(
    (r) => r.userId === currentUser.id,
  )?.emoji

  const handleCommentReaction = (emoji: string) => {
    const existing = commentReactions.find((r) => r.userId === currentUser.id)

    if (existing && existing.emoji === emoji) {
      setCommentReactions((prev) => prev.filter((r) => r.id !== existing.id))
    } else if (existing) {
      setCommentReactions((prev) =>
        prev.map((r) => (r.id === existing.id ? { ...r, emoji } : r)),
      )
    } else {
      setCommentReactions((prev) => [
        ...prev,
        { id: `temp-${Date.now()}`, emoji, userId: currentUser.id },
      ])
    }

    commentReactionMutation.mutate({ data: { commentId: comment.id, emoji } })
  }

  return (
    <div className="group flex gap-2.5">
      {comment.author.avatarUrl ? (
        <img
          src={comment.author.avatarUrl}
          alt={comment.author.fullName}
          className="size-7 shrink-0 border border-[#1A1A1A]/10 object-cover"
        />
      ) : (
        <div className="flex size-7 shrink-0 items-center justify-center border border-[#C5A059]/30 bg-[#1C1A17] text-[0.45rem] font-medium text-[#E9D9B4]">
          {initials}
        </div>
      )}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[0.78rem] font-medium text-[#1C1815]">
            {comment.author.fullName}
          </span>
          <span className="text-[0.62rem] text-[#8E816D]">
            {formatDistanceToNow(new Date(comment.createdAt), {
              addSuffix: true,
            })}
            {isEdited && ' · edited'}
          </span>

          {(isAuthor || canDelete) && (
            <div className="ml-auto flex gap-1">
              {isAuthor && (
                <EditActionButton
                  onClick={() => {
                    setEditContent(comment.content)
                    setIsEditing(true)
                  }}
                  theme="lightGhost"
                  size="md"
                />
              )}
              {canDelete && (
                <DeleteActionButton2
                  onClick={() =>
                    deleteMutation.mutate({
                      data: { commentId: comment.id },
                    })
                  }
                  theme="lightGhost"
                  size="md"
                />
              )}
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="mt-1 flex flex-col gap-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={2}
              className="border-[#1A1A1A]/10 bg-transparent text-[0.82rem] text-[#1C1815] focus:border-[#C5A059]/40 focus-visible:ring-0"
            />
            <div className="flex justify-end gap-1.5">
              <Button
                variant="ghost"
                theme="light"
                size="sm"
                onClick={() => setIsEditing(false)}
                className="h-7 text-xs"
              >
                Cancel
              </Button>
              <Button
                theme="light"
                size="sm"
                onClick={() =>
                  editMutation.mutate({
                    data: {
                      commentId: comment.id,
                      content: editContent.trim(),
                    },
                  })
                }
                disabled={!editContent.trim() || editMutation.isPending}
                className="h-7 text-xs"
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-0.5 text-[0.82rem] leading-relaxed text-[#4E463D]">
            {comment.content}
          </p>
        )}

        {/* Comment reactions */}
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {Object.entries(commentReactionGroups).map(([emoji, userIds]) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleCommentReaction(emoji)}
              className={cn(
                'inline-flex items-center gap-1 border px-1.5 py-0.5 text-[0.7rem] transition-colors',
                userIds.includes(currentUser.id)
                  ? 'border-[#C5A059]/40 bg-[#C5A059]/10 text-[#9B7A41]'
                  : 'border-[#1A1A1A]/10 text-[#8E816D] hover:border-[#C5A059]/30',
              )}
            >
              <span>{emoji}</span>
              <span className="text-[0.62rem] font-medium">
                {userIds.length}
              </span>
            </button>
          ))}

          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                theme="lightGhost"
                className={cn(
                  'rounded-none border-none bg-transparent text-[#8E816D] shadow-none hover:translate-y-0 hover:bg-black/5 hover:text-[#1C1815]',
                  userCommentReactionEmoji ? 'text-[#9B7A41]' : undefined,
                )}
              >
                <SmilePlus className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-auto p-2">
              <div className="flex gap-0.5">
                {REACTION_EMOJIS.map((emoji) => (
                  <DropdownMenuItem
                    key={emoji}
                    onClick={() => handleCommentReaction(emoji)}
                    className={cn(
                      'flex size-7 cursor-pointer items-center justify-center p-0',
                      userCommentReactionEmoji === emoji
                        ? 'bg-[#C5A059]/10 text-[#9B7A41]'
                        : 'text-[#1C1815]',
                    )}
                  >
                    <span className="text-base leading-none">{emoji}</span>
                  </DropdownMenuItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}

// ── Comment Composer ──────────────────────────────────────────────────────

function CommentComposer({
  postId,
  currentUser,
  onCreated,
}: {
  postId: string
  currentUser: CurrentUser
  onCreated: (comment: CommentWithAuthor) => void
}) {
  const [content, setContent] = useState('')

  const mutation = useMutation({
    fn: createComment,
    onSuccess: ({ data }) => {
      onCreated({
        id: data.comment.id,
        content: data.comment.content,
        createdAt: data.comment.createdAt,
        updatedAt: data.comment.updatedAt,
        author: data.comment.author,
        reactions: data.comment.reactions,
      })
      setContent('')
    },
  })

  const handleSubmit = () => {
    const trimmed = content.trim()
    if (!trimmed) return
    mutation.mutate({ data: { postId, content: trimmed } })
  }

  return (
    <div className="flex gap-2.5">
      {currentUser.avatarUrl ? (
        <img
          src={currentUser.avatarUrl}
          alt={currentUser.fullName}
          className="size-7 shrink-0 border border-[#1A1A1A]/10 object-cover"
        />
      ) : (
        <div className="flex size-7 shrink-0 items-center justify-center border border-[#C5A059]/30 bg-[#1C1A17] text-[0.45rem] font-medium text-[#E9D9B4]">
          {currentUser.fullName
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()}
        </div>
      )}
      <div className="flex flex-1 items-center gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a comment…"
          className="h-8 flex-1 border border-[#1A1A1A]/10 bg-transparent px-3 text-[0.82rem] text-[#1C1815] placeholder:text-[#8E816D] focus:border-[#C5A059]/40 focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit()
            }
          }}
        />
        <Button
          theme="light"
          size="icon"
          className="size-8"
          onClick={handleSubmit}
          disabled={!content.trim() || mutation.isPending}
        >
          {mutation.isPending ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <SendIcon className="size-3" />
          )}
        </Button>
      </div>
    </div>
  )
}

// ── Comment Composer ───────────────────────────────────────────────────────────
