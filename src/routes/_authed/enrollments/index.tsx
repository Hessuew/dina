import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { EyeIcon, FileTextIcon, UserRoundXIcon, UsersIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { EnrollmentSortKey } from '@/utils/enrolment/repository/enrolment.repository'
import { Button } from '@/components/ui/button'
import { EnrollmentsTable } from '@/components/table/EnrollmentsTable'
import { EvaluationOverlay } from '@/components/enrollment/EvaluationOverlay'
import { PageLayout } from '@/components/layout/page-layout'
import {
  EndSubstitutionDialog,
  StartSubstitutionDialog,
} from '@/components/dialog/SubstituteTeacherDialog'
import { checkTeacherAccess } from '@/utils/auth/admin'
import { distributeEnrollments, getEnrollments } from '@/utils/enrolment'
import { parseEnrollmentsSearch } from '@/utils/enrolment/domain/enrollments-search.domain'
import { useEnrollmentReview } from '@/hooks/useEnrollmentReview'
import { toUserError } from '@/utils/errors'

export const Route = createFileRoute('/_authed/enrollments/')({
  validateSearch: parseEnrollmentsSearch,
  loaderDeps: ({ search }) => ({
    page: search.page,
    pageSize: search.pageSize,
    search: search.search,
    sortBy: search.sortBy,
    sortDir: search.sortDir,
    viewAll: search.viewAll,
  }),
  beforeLoad: async () => {
    await checkTeacherAccess()
  },
  loader: async ({ deps }) => {
    const result = await getEnrollments({
      data: {
        page: deps.page,
        pageSize: deps.pageSize as 10 | 20 | 50 | 100,
        search: deps.search,
        sortBy: deps.sortBy,
        sortDir: deps.sortDir,
        viewAll: deps.viewAll,
      },
    })
    return {
      enrollments: result.enrollments,
      total: result.total,
      evaluations: result.evaluations,
    }
  },
  component: EnrollmentsPage,
})

function EnrollmentsPage() {
  const { enrollments, total, evaluations } = Route.useLoaderData()
  const { user } = Route.useRouteContext()
  const router = useRouter()
  const { page, pageSize, search, sortBy, sortDir, review, viewAll } =
    Route.useSearch()
  const isAdmin = user?.role === 'admin'
  const [isListLoading, setIsListLoading] = useState(false)
  const [isDistributing, setIsDistributing] = useState(false)
  const [isStartSubDialogOpen, setIsStartSubDialogOpen] = useState(false)
  const [isEndSubDialogOpen, setIsEndSubDialogOpen] = useState(false)

  const reviewState = useEnrollmentReview({
    initialEnrollments: enrollments,
    initialEvaluations: evaluations,
    page,
    pageSize: pageSize as 10 | 20 | 50 | 100,
    search,
    sortBy,
    sortDir,
    total,
    viewAll,
    reviewId: review,
  })

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleRefresh = () => {
    router.invalidate()
  }

  const handleToggleViewAll = () => {
    void router.navigate({
      to: '/enrollments',
      search: {
        page: 1,
        pageSize,
        search,
        sortBy,
        sortDir,
        review: undefined,
        viewAll: !viewAll,
      },
      replace: true,
      resetScroll: false,
    })
  }

  const handleDistribute = async () => {
    setIsDistributing(true)
    try {
      const { assigned } = await distributeEnrollments({ data: {} })
      toast.success(
        assigned > 0
          ? `Distributed ${assigned} enrollment${assigned === 1 ? '' : 's'}`
          : 'No unassigned enrollments to distribute',
      )
      void router.invalidate()
    } catch (error) {
      toast.error(toUserError(error).message)
    } finally {
      setIsDistributing(false)
    }
  }

  const navigate = useCallback(
    (params: {
      page?: number
      pageSize?: number
      search?: string
      sortBy?: EnrollmentSortKey
      sortDir?: 'asc' | 'desc'
    }) => {
      const next = {
        page: params.page ?? page,
        pageSize: params.pageSize ?? pageSize,
        search: params.search ?? search,
        sortBy: params.sortBy ?? sortBy,
        sortDir: params.sortDir ?? sortDir,
      }

      if (
        next.page === page &&
        next.pageSize === pageSize &&
        next.search === search &&
        next.sortBy === sortBy &&
        next.sortDir === sortDir
      ) {
        setIsListLoading(false)
        return
      }

      setIsListLoading(true)
      router.navigate({
        to: '/enrollments',
        search: {
          ...next,
          review: undefined,
          viewAll,
        },
        replace: true,
        resetScroll: false,
      })
    },
    [router, page, pageSize, search, sortBy, sortDir, viewAll],
  )

  useEffect(() => {
    setIsListLoading(false)
  }, [enrollments, total, evaluations])

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [])

  return (
    <PageLayout>
      <div className="mb-10 flex items-end justify-between gap-6">
        <div>
          <div className="h-px w-10 bg-[#C5A059]/50" />
          <h1 className="mt-3 font-serif text-3xl tracking-[-0.02em] text-[#1C1815]">
            Enrollments
          </h1>
          <p className="mt-2 text-[0.72rem] font-medium tracking-[0.22em] text-[#8E816D] uppercase">
            Review public enrolment submissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            theme="light"
            variant={viewAll ? 'default' : 'outline'}
            onClick={handleToggleViewAll}
          >
            <EyeIcon className="size-3.5" />
            {viewAll ? 'Show Own' : 'View All'}
          </Button>
          {isAdmin && (
            <>
              <Button
                theme="light"
                variant="outline"
                onClick={() => void handleDistribute()}
                disabled={isDistributing}
              >
                <UsersIcon className="size-3.5" />
                Distribute unassigned
              </Button>
              <Button
                theme="light"
                variant="outline"
                onClick={() => setIsStartSubDialogOpen(true)}
              >
                <UsersIcon className="size-3.5" />
                Substitute teacher
              </Button>
              <Button
                theme="light"
                variant="outline"
                onClick={() => setIsEndSubDialogOpen(true)}
              >
                <UserRoundXIcon className="size-3.5" />
                End substitution
              </Button>
            </>
          )}
          <Button
            theme="light"
            variant="outline"
            onClick={() => handleRefresh()}
          >
            <FileTextIcon className="size-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      <EnrollmentsTable
        enrollments={enrollments}
        onRefresh={handleRefresh}
        onReview={reviewState.open}
        isAdmin={isAdmin}
        initialPage={page}
        pageSize={pageSize}
        rowCount={total}
        initialSearch={search}
        initialSortBy={sortBy}
        initialSortDir={sortDir}
        isLoading={isListLoading}
        onPageChange={(p) => navigate({ page: p })}
        onPageSizeChange={(ps) => navigate({ page: 1, pageSize: ps })}
        onSearchChange={(s) => {
          if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
          if (s === search) {
            setIsListLoading(false)
            return
          }
          setIsListLoading(true)
          searchDebounceRef.current = setTimeout(() => {
            navigate({ page: 1, search: s })
          }, 300)
        }}
        onSortingChange={(by, dir) =>
          navigate({
            page: 1,
            sortBy: (by ?? 'createdAt') as EnrollmentSortKey,
            sortDir: by ? dir : 'desc',
          })
        }
      />

      {isAdmin && (
        <>
          <StartSubstitutionDialog
            open={isStartSubDialogOpen}
            onOpenChange={setIsStartSubDialogOpen}
            onSuccess={() => void router.invalidate()}
          />
          <EndSubstitutionDialog
            open={isEndSubDialogOpen}
            onOpenChange={setIsEndSubDialogOpen}
            onSuccess={() => void router.invalidate()}
          />
        </>
      )}

      {reviewState.isOpen && reviewState.current && user && (
        <EvaluationOverlay
          enrollment={reviewState.current}
          evaluations={reviewState.currentEvaluations}
          isAdmin={isAdmin}
          userId={user.id}
          hasPrev={reviewState.hasPrev}
          hasNext={reviewState.hasNext}
          onPrev={reviewState.prev}
          onNext={reviewState.next}
          onClose={() => {
            reviewState.close()
            void router.invalidate()
          }}
          onLocalEvaluation={(enrollmentId, patch) =>
            reviewState.applyLocalEvaluation(
              enrollmentId,
              user.id,
              user.fullName ?? user.email,
              patch,
            )
          }
        />
      )}
    </PageLayout>
  )
}
