const LOADING_LABEL = 'Loading…'

export interface CommentsSectionViewModel {
  showHeader: boolean
  countLabel: string
  showViewAllButton: boolean
  viewAllLabel: string
  viewAllDisabled: boolean
  showComments: boolean
  showLoadMoreButton: boolean
  loadMoreLabel: string
  loadMoreDisabled: boolean
}

export function buildCommentsSectionViewModel(input: {
  commentCount: number
  commentsLength: number
  showAllComments: boolean
  hasMoreComments: boolean
  loadingComments: boolean
}): CommentsSectionViewModel {
  const {
    commentCount,
    commentsLength,
    showAllComments,
    hasMoreComments,
    loadingComments,
  } = input

  return {
    showHeader: commentCount > 0,
    countLabel: `${commentCount} ${commentCount === 1 ? 'comment' : 'comments'}`,
    showViewAllButton: !showAllComments && commentCount > 3,
    viewAllLabel: loadingComments ? LOADING_LABEL : 'View all',
    viewAllDisabled: loadingComments,
    showComments: commentsLength > 0,
    showLoadMoreButton: showAllComments && hasMoreComments,
    loadMoreLabel: loadingComments ? LOADING_LABEL : 'Load more comments',
    loadMoreDisabled: loadingComments,
  }
}
