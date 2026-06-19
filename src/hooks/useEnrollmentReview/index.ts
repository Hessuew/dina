import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
import {
  computeInitialIndex,
  computePosition,
  computeTotalPages,
  deriveHasNext,
  deriveHasPrev,
  groupEvaluations,
  navigateBackward,
  navigateForward,
} from './domain/enrollment-review.domain'
import type { EnrollmentWithEvaluation } from '@/utils/enrolment/domain/enrolment.domain'
import type {
  EnrollmentSortKey,
  EvaluationWithAuthor,
} from '@/utils/enrolment/repository/enrolment.repository'
import type { EvalMap } from './domain/enrollment-review.domain'
import type { EvaluationPatch } from '@/utils/enrolment/domain/evaluation.domain'
import { applyEvaluationPatch } from '@/utils/enrolment/domain/evaluation.domain'
import { getEnrollments } from '@/utils/enrolment'

type PageSize = 10 | 20 | 50 | 100

type UseEnrollmentReviewArgs = {
  initialEnrollments: Array<EnrollmentWithEvaluation>
  initialEvaluations: Array<EvaluationWithAuthor>
  page: number
  pageSize: PageSize
  search: string
  sortBy: EnrollmentSortKey
  sortDir: 'asc' | 'desc'
  total: number
  viewAll: boolean
  reviewId?: string
}

function syncReviewParam(id: string | null) {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  if (id) url.searchParams.set('review', id)
  else url.searchParams.delete('review')
  window.history.replaceState(window.history.state, '', url.toString())
}

/**
 * In-memory carousel over the current filtered+sorted enrollment list.
 *
 * Seeds from the route loader's page, moves instantly within loaded items,
 * and prefetches the next page in the background near the edge so crossing a
 * page boundary stays instant. The `?review` URL param is mirrored via the
 * History API (not the router) so arrow navigation never re-runs the route's
 * auth `beforeLoad`.
 */
export function useEnrollmentReview({
  initialEnrollments,
  initialEvaluations,
  page,
  pageSize,
  search,
  sortBy,
  sortDir,
  total,
  viewAll,
  reviewId,
}: UseEnrollmentReviewArgs) {
  const getEnrollmentsFn = useServerFn(getEnrollments)

  const [items, setItems] =
    useState<Array<EnrollmentWithEvaluation>>(initialEnrollments)
  const [evalMap, setEvalMap] = useState<EvalMap>(() =>
    groupEvaluations(initialEvaluations),
  )
  const [minPage, setMinPage] = useState(page)
  const [maxPage, setMaxPage] = useState(page)
  const [index, setIndex] = useState<number | null>(() =>
    computeInitialIndex(reviewId, initialEnrollments),
  )

  const totalPages = computeTotalPages(total, pageSize)
  const loadingRef = useRef<Set<number>>(new Set())

  // Reset the carousel when the underlying list changes (sort/search/page/view).
  const depsKey = `${page}|${pageSize}|${search}|${sortBy}|${sortDir}|${viewAll}`
  const prevDepsKey = useRef(depsKey)
  useEffect(() => {
    if (prevDepsKey.current === depsKey) return
    prevDepsKey.current = depsKey
    setItems(initialEnrollments)
    setEvalMap(groupEvaluations(initialEvaluations))
    setMinPage(page)
    setMaxPage(page)
    setIndex(null)
  }, [depsKey, initialEnrollments, initialEvaluations, page])

  const loadPage = useCallback(
    async (
      targetPage: number,
      mode: 'append' | 'prepend',
    ): Promise<Array<EnrollmentWithEvaluation>> => {
      if (loadingRef.current.has(targetPage)) return []
      loadingRef.current.add(targetPage)
      try {
        const res = await getEnrollmentsFn({
          data: {
            page: targetPage,
            pageSize,
            search,
            sortBy,
            sortDir,
            viewAll,
          },
        })
        const fetched = res.enrollments
        setEvalMap((prevMap) => {
          const merged = new Map(prevMap)
          for (const [key, value] of groupEvaluations(res.evaluations)) {
            merged.set(key, value)
          }
          return merged
        })
        if (mode === 'append') {
          setItems((prevItems) => [...prevItems, ...fetched])
          setMaxPage(targetPage)
        } else {
          setItems((prevItems) => [...fetched, ...prevItems])
          setMinPage(targetPage)
        }
        return fetched
      } finally {
        loadingRef.current.delete(targetPage)
      }
    },
    [getEnrollmentsFn, pageSize, search, sortBy, sortDir, viewAll],
  )

  const open = useCallback(
    (id: string) => {
      const i = items.findIndex((e) => e.id === id)
      if (i < 0) return
      setIndex(i)
      syncReviewParam(id)
    },
    [items],
  )

  const close = useCallback(() => {
    setIndex(null)
    syncReviewParam(null)
  }, [])

  const goNext = useCallback(
    () =>
      navigateForward({
        index,
        items,
        maxPage,
        totalPages,
        loadPage,
        setIndex,
        syncReviewParam,
        onError: (message) => toast.error(message),
      }),
    [index, items, maxPage, totalPages, loadPage],
  )

  const goPrev = useCallback(
    () =>
      navigateBackward({
        index,
        items,
        minPage,
        loadPage,
        setIndex,
        syncReviewParam,
        onError: (message) => toast.error(message),
      }),
    [index, items, minPage, loadPage],
  )

  // Background prefetch of the next page when nearing the end of loaded items.
  useEffect(() => {
    if (index === null) return
    if (index >= items.length - 2 && maxPage < totalPages) {
      void loadPage(maxPage + 1, 'append')
    }
  }, [index, items.length, maxPage, totalPages, loadPage])

  const applyLocalEvaluation = useCallback(
    (
      enrollmentId: string,
      evaluatorId: string,
      evaluatorName: string,
      patch: EvaluationPatch,
    ) => {
      setEvalMap((prevMap) => {
        const next = new Map(prevMap)
        next.set(
          enrollmentId,
          applyEvaluationPatch(
            next.get(enrollmentId) ?? [],
            { enrollmentId, evaluatorId, evaluatorName },
            patch,
          ),
        )
        return next
      })
    },
    [],
  )

  const current = index !== null ? (items[index] ?? null) : null
  const currentEvaluations = useMemo(
    () => (current ? (evalMap.get(current.id) ?? []) : []),
    [current, evalMap],
  )

  return {
    isOpen: index !== null,
    current,
    currentEvaluations,
    position: computePosition(index),
    hasPrev: deriveHasPrev(index, minPage),
    hasNext: deriveHasNext(index, items.length, maxPage, totalPages),
    open,
    close,
    next: goNext,
    prev: goPrev,
    applyLocalEvaluation,
  }
}
