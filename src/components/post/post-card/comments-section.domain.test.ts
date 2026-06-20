import { describe, expect, it } from 'vitest'
import { buildCommentsSectionViewModel } from './comments-section.domain'

describe('buildCommentsSectionViewModel', () => {
  const base = {
    commentCount: 0,
    commentsLength: 0,
    showAllComments: false,
    hasMoreComments: false,
    loadingComments: false,
  }

  describe('header visibility', () => {
    it('hides the header when there are no comments', () => {
      expect(buildCommentsSectionViewModel(base).showHeader).toBe(false)
    })

    it('shows the header when there is at least one comment', () => {
      expect(
        buildCommentsSectionViewModel({ ...base, commentCount: 1 }).showHeader,
      ).toBe(true)
    })
  })

  describe('count label', () => {
    it('uses the singular form for exactly one comment', () => {
      expect(
        buildCommentsSectionViewModel({ ...base, commentCount: 1 }).countLabel,
      ).toBe('1 comment')
    })

    it('uses the plural form for more than one comment', () => {
      expect(
        buildCommentsSectionViewModel({ ...base, commentCount: 4 }).countLabel,
      ).toBe('4 comments')
    })

    it('uses the plural form for zero comments', () => {
      expect(buildCommentsSectionViewModel(base).countLabel).toBe('0 comments')
    })
  })

  describe('"view all" button', () => {
    it('shows when collapsed and there are more than three comments', () => {
      expect(
        buildCommentsSectionViewModel({
          ...base,
          commentCount: 4,
          showAllComments: false,
        }).showViewAllButton,
      ).toBe(true)
    })

    it('hides when already showing all comments', () => {
      expect(
        buildCommentsSectionViewModel({
          ...base,
          commentCount: 4,
          showAllComments: true,
        }).showViewAllButton,
      ).toBe(false)
    })

    it('hides when there are three or fewer comments', () => {
      expect(
        buildCommentsSectionViewModel({
          ...base,
          commentCount: 3,
          showAllComments: false,
        }).showViewAllButton,
      ).toBe(false)
    })

    it('labels the button "View all" when idle', () => {
      expect(
        buildCommentsSectionViewModel({ ...base, loadingComments: false })
          .viewAllLabel,
      ).toBe('View all')
    })

    it('labels the button with a loading state when loading', () => {
      expect(
        buildCommentsSectionViewModel({ ...base, loadingComments: true })
          .viewAllLabel,
      ).toBe('Loading…')
    })
  })

  describe('comments list visibility', () => {
    it('hides the list when there are no loaded comments', () => {
      expect(
        buildCommentsSectionViewModel({ ...base, commentsLength: 0 })
          .showComments,
      ).toBe(false)
    })

    it('shows the list when comments are loaded', () => {
      expect(
        buildCommentsSectionViewModel({ ...base, commentsLength: 2 })
          .showComments,
      ).toBe(true)
    })
  })

  describe('"load more" button', () => {
    it('shows when expanded and more comments remain', () => {
      expect(
        buildCommentsSectionViewModel({
          ...base,
          showAllComments: true,
          hasMoreComments: true,
        }).showLoadMoreButton,
      ).toBe(true)
    })

    it('hides when collapsed even if more comments remain', () => {
      expect(
        buildCommentsSectionViewModel({
          ...base,
          showAllComments: false,
          hasMoreComments: true,
        }).showLoadMoreButton,
      ).toBe(false)
    })

    it('hides when expanded but no more comments remain', () => {
      expect(
        buildCommentsSectionViewModel({
          ...base,
          showAllComments: true,
          hasMoreComments: false,
        }).showLoadMoreButton,
      ).toBe(false)
    })

    it('labels the button "Load more comments" when idle', () => {
      expect(
        buildCommentsSectionViewModel({ ...base, loadingComments: false })
          .loadMoreLabel,
      ).toBe('Load more comments')
    })

    it('labels the button with a loading state when loading', () => {
      expect(
        buildCommentsSectionViewModel({ ...base, loadingComments: true })
          .loadMoreLabel,
      ).toBe('Loading…')
    })
  })

  describe('disabled states', () => {
    it('disables the "view all" button when loading', () => {
      expect(
        buildCommentsSectionViewModel({ ...base, loadingComments: true })
          .viewAllDisabled,
      ).toBe(true)
    })

    it('enables the "view all" button when not loading', () => {
      expect(
        buildCommentsSectionViewModel({ ...base, loadingComments: false })
          .viewAllDisabled,
      ).toBe(false)
    })

    it('disables the "load more" button when loading', () => {
      expect(
        buildCommentsSectionViewModel({ ...base, loadingComments: true })
          .loadMoreDisabled,
      ).toBe(true)
    })

    it('enables the "load more" button when not loading', () => {
      expect(
        buildCommentsSectionViewModel({ ...base, loadingComments: false })
          .loadMoreDisabled,
      ).toBe(false)
    })
  })
})
