import {
  Loader2,
  MessageCircle,
  SendIcon,
  SmilePlus,
  XIcon,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import type {
  CommentWithAuthor,
  PostWithDetails,
} from '@/utils/post/domain/post.domain'
import type { CommentsSectionViewModel } from '@/components/post/post-card/comments-section.domain'
import { Button } from '@/components/ui/button'
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
import {
  createComment,
  deleteComment,
  deletePost,
  getComments,
  toggleCommentReaction,
  toggleReaction,
  updateComment,
  updatePost,
} from '@/utils/post/posts'
import { buildCommentsSectionViewModel } from '@/components/post/post-card/comments-section.domain'

type CurrentUser = {
  id: string
  fullName: string
  avatarUrl: string | null
  role: 'student' | 'teacher' | 'admin'
}

function getInitials(fullName: string): string {
  return fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function AuthorAvatar({
  avatarUrl,
  fullName,
  size,
}: {
  avatarUrl: string | null
  fullName: string
  size: 'sm' | 'md'
}) {
  const dimensions = size === 'md' ? 'size-10' : 'size-7'
  const textSize = size === 'md' ? 'text-[0.55rem]' : 'text-[0.45rem]'

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={fullName}
        className={cn(
          dimensions,
          'shrink-0 border border-[#1A1A1A]/10 object-cover',
        )}
      />
    )
  }

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center border border-[#C5A059]/30 bg-[#1C1A17] font-medium text-[#E9D9B4]',
        dimensions,
        textSize,
      )}
    >
      {getInitials(fullName)}
    </div>
  )
}

function PostHeader({
  post,
  isEdited,
  isAuthor,
  canDelete,
  onEdit,
  onDelete,
}: {
  post: PostWithDetails
  isEdited: boolean
  isAuthor: boolean
  canDelete: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 h-10 w-10 shrink-0 overflow-hidden rounded-none bg-[#EDE8DE]">
          <AuthorAvatar
            avatarUrl={post.author.avatarUrl}
            fullName={post.author.fullName}
            size="md"
          />
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
            <EditActionButton onClick={onEdit} theme="lightGhost" size="md" />
          )}
          {canDelete && (
            <DeleteActionButton2
              onClick={onDelete}
              theme="lightGhost"
              size="md"
            />
          )}
        </div>
      )}
    </div>
  )
}

function PostContent({
  content,
  editContent,
  isEditing,
  isSaving,
  onEditContent,
  onCancel,
  onSave,
}: {
  content: string
  editContent: string
  isEditing: boolean
  isSaving: boolean
  onEditContent: (content: string) => void
  onCancel: () => void
  onSave: () => void
}) {
  if (!isEditing) {
    return (
      <div className="px-5 pt-3 pb-4">
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-[#4E463D]">
          {content}
        </p>
      </div>
    )
  }

  return (
    <div className="px-5 pt-3 pb-4">
      <div className="flex flex-col gap-3">
        <Textarea
          value={editContent}
          onChange={(e) => onEditContent(e.target.value)}
          rows={3}
          className="border-[#1A1A1A]/10 bg-transparent text-sm text-[#1C1815] focus:border-[#C5A059]/40 focus-visible:ring-0"
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" theme="light" size="sm" onClick={onCancel}>
            <XIcon className="size-3.5" />
            Cancel
          </Button>
          <Button
            theme="light"
            size="sm"
            onClick={onSave}
            disabled={!editContent.trim() || isSaving}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}

function buildReactionGroups(
  reactions: Array<{ emoji: string; userId: string }>,
): Record<string, Array<string>> {
  return reactions.reduce<Record<string, Array<string>>>((acc, r) => {
    acc[r.emoji] ??= []
    acc[r.emoji].push(r.userId)
    return acc
  }, {})
}

function ReactionPicker({
  selectedEmoji,
  buttonSize,
  iconSize,
  itemSize,
  onSelect,
}: {
  selectedEmoji: string | undefined
  buttonSize: 'icon' | 'icon-xs'
  iconSize: string
  itemSize: string
  onSelect: (emoji: string) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            size={buttonSize}
            variant="ghost"
            theme="lightGhost"
            className={cn(
              'rounded-none border-none bg-transparent text-[#8E816D] shadow-none hover:translate-y-0 hover:bg-black/5 hover:text-[#1C1815]',
              buttonSize === 'icon' ? 'size-8' : undefined,
              selectedEmoji ? 'text-[#9B7A41]' : undefined,
            )}
          >
            <SmilePlus className={iconSize} />
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-auto p-2">
        <div className="flex gap-0.5">
          {REACTION_EMOJIS.map((emoji) => (
            <DropdownMenuItem
              key={emoji}
              onClick={() => onSelect(emoji)}
              className={cn(
                'flex cursor-pointer items-center justify-center p-0',
                itemSize,
                selectedEmoji === emoji
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
  )
}

function ReactionsBar({
  reactions,
  currentUserId,
  onReaction,
}: {
  reactions: PostWithDetails['reactions']
  currentUserId: string
  onReaction: (emoji: string) => void
}) {
  const reactionGroups = buildReactionGroups(reactions)
  const userReactionEmoji = reactions.find(
    (r) => r.userId === currentUserId,
  )?.emoji

  return (
    <div className="border-t border-[#1A1A1A]/8 px-5 py-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {Object.entries(reactionGroups).map(([emoji, userIds]) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onReaction(emoji)}
            className={cn(
              'inline-flex items-center gap-1 border px-2 py-0.5 text-xs transition-colors',
              userIds.includes(currentUserId)
                ? 'border-[#C5A059]/40 bg-[#C5A059]/10 text-[#9B7A41]'
                : 'border-[#1A1A1A]/10 text-[#8E816D] hover:border-[#C5A059]/30',
            )}
          >
            <span>{emoji}</span>
            <span className="text-[0.65rem] font-medium">{userIds.length}</span>
          </button>
        ))}

        <ReactionPicker
          selectedEmoji={userReactionEmoji}
          buttonSize="icon"
          iconSize="size-3.5"
          itemSize="size-8"
          onSelect={onReaction}
        />
      </div>
    </div>
  )
}

function CommentsSection({
  postId,
  currentUser,
  canModerate,
  commentCount,
  comments,
  showAllComments,
  hasMoreComments,
  loadingComments,
  onLoadAllComments,
  onLoadMoreComments,
  onCommentCreated,
  onCommentDeleted,
  onCommentUpdated,
}: {
  postId: string
  currentUser: CurrentUser
  canModerate: boolean
  commentCount: number
  comments: Array<CommentWithAuthor>
  showAllComments: boolean
  hasMoreComments: boolean
  loadingComments: boolean
  onLoadAllComments: () => void
  onLoadMoreComments: () => void
  onCommentCreated: (comment: CommentWithAuthor) => void
  onCommentDeleted: (id: string) => void
  onCommentUpdated: (comment: CommentWithAuthor) => void
}) {
  const vm = buildCommentsSectionViewModel({
    commentCount,
    commentsLength: comments.length,
    showAllComments,
    hasMoreComments,
    loadingComments,
  })

  return (
    <div className="border-t border-[#1A1A1A]/8 px-5 py-3">
      <CommentsCountHeader vm={vm} onLoadAllComments={onLoadAllComments} />

      <CommentItemsList
        vm={vm}
        comments={comments}
        currentUser={currentUser}
        canModerate={canModerate}
        onCommentDeleted={onCommentDeleted}
        onCommentUpdated={onCommentUpdated}
      />

      {vm.showLoadMoreButton && (
        <button
          type="button"
          onClick={onLoadMoreComments}
          className="mb-4 text-[0.72rem] font-medium text-[#9B7A41] hover:text-[#C5A059]"
          disabled={vm.loadMoreDisabled}
        >
          {vm.loadMoreLabel}
        </button>
      )}

      <CommentComposer
        postId={postId}
        currentUser={currentUser}
        onCreated={onCommentCreated}
      />
    </div>
  )
}

function CommentsCountHeader({
  vm,
  onLoadAllComments,
}: {
  vm: CommentsSectionViewModel
  onLoadAllComments: () => void
}) {
  if (!vm.showHeader) return null
  return (
    <div className="mb-3 flex items-center gap-2">
      <MessageCircle className="size-3.5 text-[#8E816D]" />
      <span className="text-[0.68rem] font-medium tracking-widest text-[#8E816D] uppercase">
        {vm.countLabel}
      </span>
      {vm.showViewAllButton && (
        <button
          type="button"
          onClick={onLoadAllComments}
          className="ml-auto text-[0.68rem] font-medium text-[#9B7A41] hover:text-[#C5A059]"
          disabled={vm.viewAllDisabled}
        >
          {vm.viewAllLabel}
        </button>
      )}
    </div>
  )
}

function CommentItemsList({
  vm,
  comments,
  currentUser,
  canModerate,
  onCommentDeleted,
  onCommentUpdated,
}: {
  vm: CommentsSectionViewModel
  comments: Array<CommentWithAuthor>
  currentUser: CurrentUser
  canModerate: boolean
  onCommentDeleted: (id: string) => void
  onCommentUpdated: (comment: CommentWithAuthor) => void
}) {
  if (!vm.showComments) return null
  return (
    <div className="mb-3 flex flex-col gap-2">
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          currentUser={currentUser}
          canModerate={canModerate}
          onDeleted={onCommentDeleted}
          onUpdated={onCommentUpdated}
        />
      ))}
    </div>
  )
}

export function PostCard({
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

  const displayedComments = showAllComments ? allComments : previewComments

  return (
    <div
      id={`post-${post.id}`}
      className="border border-[#1A1A1A]/10 bg-white/60 shadow-[0_22px_44px_-28px_rgba(0,0,0,0.08)]"
    >
      <PostHeader
        post={post}
        isEdited={isEdited}
        isAuthor={isAuthor}
        canDelete={canDelete}
        onEdit={() => {
          setEditContent(post.content)
          setIsEditing(true)
        }}
        onDelete={() => deleteMutation.mutate({ data: { postId: post.id } })}
      />
      <PostContent
        content={post.content}
        editContent={editContent}
        isEditing={isEditing}
        isSaving={updateMutation.isPending}
        onEditContent={setEditContent}
        onCancel={() => setIsEditing(false)}
        onSave={() =>
          updateMutation.mutate({
            data: { postId: post.id, content: editContent.trim() },
          })
        }
      />
      <ReactionsBar
        reactions={reactions}
        currentUserId={currentUser.id}
        onReaction={handleReaction}
      />
      <CommentsSection
        postId={post.id}
        currentUser={currentUser}
        canModerate={canModerate}
        commentCount={commentCount}
        comments={displayedComments}
        showAllComments={showAllComments}
        hasMoreComments={commentsNextCursor !== undefined}
        loadingComments={loadingComments}
        onLoadAllComments={handleLoadAllComments}
        onLoadMoreComments={handleLoadMoreComments}
        onCommentCreated={handleCommentCreated}
        onCommentDeleted={handleCommentDeleted}
        onCommentUpdated={handleCommentUpdated}
      />
    </div>
  )
}

// ── Comment Item ──────────────────────────────────────────────────────────

function CommentHeader({
  comment,
  isEdited,
  isAuthor,
  canDelete,
  onEdit,
  onDelete,
}: {
  comment: CommentWithAuthor
  isEdited: boolean
  isAuthor: boolean
  canDelete: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  return (
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
            <EditActionButton onClick={onEdit} theme="lightGhost" size="md" />
          )}
          {canDelete && (
            <DeleteActionButton2
              onClick={onDelete}
              theme="lightGhost"
              size="md"
            />
          )}
        </div>
      )}
    </div>
  )
}

function CommentContent({
  content,
  editContent,
  isEditing,
  isSaving,
  onEditContent,
  onCancel,
  onSave,
}: {
  content: string
  editContent: string
  isEditing: boolean
  isSaving: boolean
  onEditContent: (content: string) => void
  onCancel: () => void
  onSave: () => void
}) {
  if (!isEditing) {
    return (
      <p className="mt-0.5 text-[0.82rem] leading-relaxed text-[#4E463D]">
        {content}
      </p>
    )
  }

  return (
    <div className="mt-1 flex flex-col gap-2">
      <Textarea
        value={editContent}
        onChange={(e) => onEditContent(e.target.value)}
        rows={2}
        className="border-[#1A1A1A]/10 bg-transparent text-[0.82rem] text-[#1C1815] focus:border-[#C5A059]/40 focus-visible:ring-0"
      />
      <div className="flex justify-end gap-1.5">
        <Button
          variant="ghost"
          theme="light"
          size="sm"
          onClick={onCancel}
          className="h-7 text-xs"
        >
          Cancel
        </Button>
        <Button
          theme="light"
          size="sm"
          onClick={onSave}
          disabled={!editContent.trim() || isSaving}
          className="h-7 text-xs"
        >
          Save
        </Button>
      </div>
    </div>
  )
}

function CommentReactions({
  reactions,
  currentUserId,
  selectedEmoji,
  onReaction,
}: {
  reactions: Array<{ emoji: string; userId: string }>
  currentUserId: string
  selectedEmoji: string | undefined
  onReaction: (emoji: string) => void
}) {
  const reactionGroups = buildReactionGroups(reactions)

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1">
      {Object.entries(reactionGroups).map(([emoji, userIds]) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onReaction(emoji)}
          className={cn(
            'inline-flex items-center gap-1 border px-1.5 py-0.5 text-[0.7rem] transition-colors',
            userIds.includes(currentUserId)
              ? 'border-[#C5A059]/40 bg-[#C5A059]/10 text-[#9B7A41]'
              : 'border-[#1A1A1A]/10 text-[#8E816D] hover:border-[#C5A059]/30',
          )}
        >
          <span>{emoji}</span>
          <span className="text-[0.62rem] font-medium">{userIds.length}</span>
        </button>
      ))}

      <ReactionPicker
        selectedEmoji={selectedEmoji}
        buttonSize="icon-xs"
        iconSize="size-3"
        itemSize="size-7"
        onSelect={onReaction}
      />
    </div>
  )
}

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
      <AuthorAvatar
        avatarUrl={comment.author.avatarUrl}
        fullName={comment.author.fullName}
        size="sm"
      />
      <div className="flex-1">
        <CommentHeader
          comment={comment}
          isEdited={isEdited}
          isAuthor={isAuthor}
          canDelete={canDelete}
          onEdit={() => {
            setEditContent(comment.content)
            setIsEditing(true)
          }}
          onDelete={() =>
            deleteMutation.mutate({
              data: { commentId: comment.id },
            })
          }
        />
        <CommentContent
          content={comment.content}
          editContent={editContent}
          isEditing={isEditing}
          isSaving={editMutation.isPending}
          onEditContent={setEditContent}
          onCancel={() => setIsEditing(false)}
          onSave={() =>
            editMutation.mutate({
              data: {
                commentId: comment.id,
                content: editContent.trim(),
              },
            })
          }
        />
        <CommentReactions
          reactions={commentReactions}
          currentUserId={currentUser.id}
          selectedEmoji={userCommentReactionEmoji}
          onReaction={handleCommentReaction}
        />
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
