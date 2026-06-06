import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
import type { EnrollmentWithEvaluation } from '@/utils/enrolment/domain/enrolment.domain'
import type {
  EnrollmentSortKey,
  EvaluationWithAuthor,
} from '@/utils/enrolment/repository/enrolment.repository'
import { getEnrollments } from '@/utils/enrolment'

type PageSize = 10 | 20 | 50 | 100

type EvalMap = Map<string, Array<EvaluationWithAuthor>>

type UseEnrollmentReviewArgs = {
  initialEnrollments: Array<EnrollmentWithEvaluation>
  initialEvaluations: Array<EvaluationWithAuthor>
  page: number
  pageSize: PageSize
  search: string
  sortBy: EnrollmentSortKey
  sortDir: 'asc' | 'desc'
  total: number
  reviewId?: string
}

function groupEvaluations(evals: Array<EvaluationWithAuthor>): EvalMap {
  const map: EvalMap = new Map()
  for (const evaluation of evals) {
    const list = map.get(evaluation.enrollmentId)
    if (list) list.push(evaluation)
    else map.set(evaluation.enrollmentId, [evaluation])
  }
  return map
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
  const [index, setIndex] = useState<number | null>(() => {
    if (!reviewId) return null
    const i = initialEnrollments.findIndex((e) => e.id === reviewId)
    return i >= 0 ? i : null
  })

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const loadingRef = useRef<Set<number>>(new Set())

  // Reset the carousel when the underlying list changes (sort/search/page).
  const depsKey = `${page}|${pageSize}|${search}|${sortBy}|${sortDir}`
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
          data: { page: targetPage, pageSize, search, sortBy, sortDir },
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
    [getEnrollmentsFn, pageSize, search, sortBy, sortDir],
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

  const goNext = useCallback(async () => {
    if (index === null) return
    if (index < items.length - 1) {
      setIndex(index + 1)
      syncReviewParam(items[index + 1].id)
      return
    }
    if (maxPage < totalPages) {
      try {
        const fetched = await loadPage(maxPage + 1, 'append')
        if (fetched.length > 0) {
          setIndex(index + 1)
          syncReviewParam(fetched[0].id)
        }
      } catch {
        toast.error('Failed to load next page')
      }
    }
  }, [index, items, maxPage, totalPages, loadPage])

  const goPrev = useCallback(async () => {
    if (index === null) return
    if (index > 0) {
      setIndex(index - 1)
      syncReviewParam(items[index - 1].id)
      return
    }
    if (minPage > 1) {
      try {
        const fetched = await loadPage(minPage - 1, 'prepend')
        if (fetched.length > 0) {
          setIndex(fetched.length - 1)
          syncReviewParam(fetched[fetched.length - 1].id)
        }
      } catch {
        toast.error('Failed to load previous page')
      }
    }
  }, [index, items, minPage, loadPage])

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
      patch: { score?: number | null; note?: string },
    ) => {
      setEvalMap((prevMap) => {
        const next = new Map(prevMap)
        const list = [...(next.get(enrollmentId) ?? [])]
        const i = list.findIndex((e) => e.evaluatorId === evaluatorId)
        if (i >= 0) {
          list[i] = {
            ...list[i],
            ...(patch.score !== undefined ? { score: patch.score } : {}),
            ...(patch.note !== undefined ? { note: patch.note } : {}),
          }
        } else {
          list.push({
            enrollmentId,
            evaluatorId,
            evaluatorName,
            score: patch.score ?? null,
            note: patch.note ?? null,
          })
        }
        next.set(enrollmentId, list)
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
    position: index !== null ? index + 1 : 0,
    hasPrev: index !== null && (index > 0 || minPage > 1),
    hasNext:
      index !== null && (index < items.length - 1 || maxPage < totalPages),
    open,
    close,
    next: goNext,
    prev: goPrev,
    applyLocalEvaluation,
  }
}
