import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useCallback, useEffect, useRef } from 'react'
import { FileTextIcon } from 'lucide-react'
import type { EnrollmentRow } from '@/components/table/EnrollmentsTable'
import type { EnrollmentSortKey } from '@/utils/enrolment/repository/enrolment.repository'
import { Button } from '@/components/ui/button'
import { EnrollmentsTable } from '@/components/table/EnrollmentsTable'
import { PAGE_SIZE_OPTIONS } from '@/components/table/DataTable'
import { PageLayout } from '@/components/layout/page-layout'
import { checkTeacherAccess } from '@/utils/auth/admin'
import { getEnrollments } from '@/utils/enrolment'
import { ENROLLMENT_SORT_KEYS } from '@/schemas/enrollment.schema'

export const Route = createFileRoute('/_authed/enrollments/')({
  validateSearch: (search: Record<string, unknown>) => ({
    page: typeof search.page === 'number' && search.page > 0 ? search.page : 1,
    pageSize: PAGE_SIZE_OPTIONS.includes(Number(search.pageSize))
      ? Number(search.pageSize)
      : 10,
    search: typeof search.search === 'string' ? search.search : '',
    sortBy: ENROLLMENT_SORT_KEYS.includes(search.sortBy as EnrollmentSortKey)
      ? (search.sortBy as EnrollmentSortKey)
      : 'createdAt',
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    sortDir: (
      search.sortDir === 'asc' || search.sortDir === 'desc'
        ? search.sortDir
        : 'desc'
    ) as 'asc' | 'desc',
  }),
  loaderDeps: ({ search }) => ({
    page: search.page,
    pageSize: search.pageSize,
    search: search.search,
    sortBy: search.sortBy,
    sortDir: search.sortDir,
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
      },
    })
    return { enrollments: result.enrollments, total: result.total }
  },
  component: EnrollmentsPage,
})

function EnrollmentsPage() {
  const { enrollments, total } = Route.useLoaderData()
  const { user } = Route.useRouteContext()
  const router = useRouter()
  const { page, pageSize, search, sortBy, sortDir } = Route.useSearch()
  const isAdmin = user?.role === 'admin'

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleRefresh = () => {
    router.invalidate()
  }

  const navigate = useCallback(
    (params: {
      page?: number
      pageSize?: number
      search?: string
      sortBy?: EnrollmentSortKey
      sortDir?: 'asc' | 'desc'
    }) => {
      router.navigate({
        to: '/enrollments',
        search: {
          page: params.page ?? page,
          pageSize: params.pageSize ?? pageSize,
          search: params.search ?? search,
          sortBy: params.sortBy ?? sortBy,
          sortDir: params.sortDir ?? sortDir,
        },
        replace: true,
        resetScroll: false,
      })
    },
    [router, page, pageSize, search, sortBy, sortDir],
  )

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
        <Button theme="light" variant="outline" onClick={() => handleRefresh()}>
          <FileTextIcon className="size-3.5" />
          Refresh
        </Button>
      </div>

      <EnrollmentsTable
        enrollments={enrollments as Array<EnrollmentRow>}
        onRefresh={handleRefresh}
        isAdmin={isAdmin}
        initialPage={page}
        pageSize={pageSize}
        rowCount={total}
        initialSearch={search}
        initialSortBy={sortBy}
        initialSortDir={sortDir}
        onPageChange={(p) => navigate({ page: p })}
        onPageSizeChange={(ps) => navigate({ page: 1, pageSize: ps })}
        onSearchChange={(s) => {
          if (searchDebounceRef.current)
            clearTimeout(searchDebounceRef.current)
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
    </PageLayout>
  )
}
