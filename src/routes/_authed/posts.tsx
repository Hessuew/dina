import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { Loader2, MessageCircle, SendIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { PostWithDetails } from '@/utils/post/domain/post.domain'
import {
  decideFocusFetch,
  decideFocusScroll,
  prependPostIfAbsent,
} from '@/utils/post/domain/focus-post.domain'
import {
  canModeratePosts,
  courseIdForChannel,
  nextChannelSearch,
  removePost,
  replacePost,
  resolveChannelView,
} from '@/utils/post/domain/posts-view.domain'
import { Button } from '@/components/ui/button'
import { PageLayout } from '@/components/layout/page-layout'
import { Textarea } from '@/components/ui/textarea'
import { useMutation } from '@/hooks/useMutation'
import { cn } from '@/lib/utils'
import { PostCard } from '@/components/post/PostCard'
import { getCurrentUser, getUserProfile } from '@/utils/auth/auth'
import {
  createPost,
  getPostById,
  getPostChannels,
  getPosts,
} from '@/utils/post/posts'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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
  const { selectedChannel, selectedCourseId, channelLabel } =
    resolveChannelView({ searchChannel: search.channel, channels })

  const focusPostId = search.focusPostId

  const [allPosts, setAllPosts] = useState<Array<PostWithDetails>>(
    loaderData.posts,
  )
  const [nextCursor, setNextCursor] = useState(loaderData.nextCursor)
  const [loadingMore, setLoadingMore] = useState(false)
  const [channelDropdownOpen, setChannelDropdownOpen] = useState(false)
  const latestChannelRequestId = useRef<number>(0)
  const loadedChannelRef = useRef<string>('general')
  const focusFetchKeyRef = useRef<string | null>(null)
  const focusScrollKeyRef = useRef<string | null>(null)

  const canModerate = canModeratePosts(currentUser.role)

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
    setChannelDropdownOpen(false)
    await navigate({
      search: nextChannelSearch(search, channelId),
      replace: false,
    })
  }

  useEffect(() => {
    if (selectedChannel === loadedChannelRef.current) return

    const requestId = ++latestChannelRequestId.current
    setLoadingMore(true)

    const courseId = courseIdForChannel(selectedChannel)
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
    const decision = decideFocusFetch({
      focusPostId,
      loadedChannel: loadedChannelRef.current,
      selectedChannel,
      loadedPostIds: allPosts.map((p) => p.id),
      lastFetchKey: focusFetchKeyRef.current,
    })
    if (!decision.fetch) return

    focusFetchKeyRef.current = decision.focusKey
    getPostById({ data: { postId: decision.postId } })
      .then((res) => {
        setAllPosts((prev) => prependPostIfAbsent(prev, res.post))
      })
      .catch(() => {
        focusFetchKeyRef.current = null
        toast.error('Could not load the linked post')
      })
  }, [allPosts, focusPostId, selectedChannel])

  useEffect(() => {
    const decision = decideFocusScroll({
      focusPostId,
      loadedChannel: loadedChannelRef.current,
      selectedChannel,
      lastScrollKey: focusScrollKeyRef.current,
    })
    if (!decision.scroll) return

    const el = document.getElementById(decision.elementId)
    if (!el) return

    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    focusScrollKeyRef.current = decision.focusKey
  }, [allPosts, focusPostId, selectedChannel])

  const handlePostCreated = (post: PostWithDetails) => {
    setAllPosts((prev) => [post, ...prev])
  }

  const handlePostUpdated = (updated: PostWithDetails) => {
    setAllPosts((prev) => replacePost(prev, updated))
  }

  const handlePostDeleted = (postId: string) => {
    setAllPosts((prev) => removePost(prev, postId))
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
            <p className="mt-2 text-sm text-[#5E5549]">{channelLabel}</p>

            {/* Mobile channel dropdown */}
            <div className="mt-4 block lg:hidden">
              <DropdownMenu
                open={channelDropdownOpen}
                onOpenChange={setChannelDropdownOpen}
              >
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      theme="lightGhost"
                      className="flex h-9 w-full items-center justify-between border border-[#1A1A1A]/10 bg-white/40 px-3 py-2 text-left shadow-none transition-all hover:translate-y-0 hover:border-[#C5A059]/30"
                    >
                      <div className="flex items-center gap-2">
                        <MessageCircle className="size-4 text-[#9B7A41]" />
                        <span className="text-sm text-[#1C1815]">Channels</span>
                      </div>
                    </Button>
                  }
                />
                <DropdownMenuContent
                  align="start"
                  className="w-full min-w-[200px]"
                >
                  {channels.map((ch) => (
                    <DropdownMenuItem
                      key={ch.id}
                      onClick={() => handleSelectChannel(ch.id)}
                      className={cn(
                        'flex cursor-pointer items-center justify-between px-3 py-2',
                        ch.id === selectedChannel
                          ? 'bg-[#C5A059]/10 text-[#1C1815]'
                          : 'text-[#5E5549]',
                      )}
                    >
                      <span className="text-sm">{ch.name}</span>
                      {ch.id === selectedChannel && (
                        <div className="ml-auto size-1.5 rounded-full bg-[#C5A059]" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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
