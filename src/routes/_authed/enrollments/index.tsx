import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { EyeIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { EnrollmentsNavRequest } from '@/utils/enrolment/domain/enrollments-navigation.domain'
import { Button } from '@/components/ui/button'
import { EnrollmentsTable } from '@/components/table/EnrollmentsTable'
import { EvaluationOverlay } from '@/components/enrollment/evaluation-overlay/EvaluationOverlay'
import { AdminActionsDropdown } from '@/components/enrollment/AdminActionsDropdown'
import { PageLayout } from '@/components/layout/page-layout'
import { checkTeacherAccess } from '@/utils/auth/admin'
import { distributeEnrollments, getEnrollments } from '@/utils/enrolment'
import { parseEnrollmentsSearch } from '@/utils/enrolment/domain/enrollments-search.domain'
import { resolveEnrollmentsNavigation } from '@/utils/enrolment/domain/enrollments-navigation.domain'
import {
  buildDistributeToastMessage,
  buildSortChangeRequest,
  getViewAllButtonProps,
  resolveIsAdmin,
  resolveReviewOverlayContext,
  resolveSearchChange,
} from '@/utils/enrolment/domain/enrollments-page.domain'
import { useEnrollmentReview } from '@/hooks/useEnrollmentReview'
import { toUserError } from '@/utils/errors'
import {
  EndSubstitutionDialog,
  StartSubstitutionDialog,
} from '@/components/dialog/SubstituteTeacherDialog'
import { ExportContactsDialog } from '@/components/enrollment/exports-email-dialog/ExportEmailsDialog'
import { BulkGradeDialog } from '@/components/enrollment/bulk-grade-dialog/BulkGradeDialog'
import { WhatsAppCampaignDialog } from '@/components/enrollment/whatsapp-campaign-dialog/WhatsAppCampaignDialog'
import { EmailCampaignDialog } from '@/components/enrollment/email-campaign-dialog/EmailCampaignDialog'

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

type AppRouter = ReturnType<typeof useRouter>
type EnrollmentsSearch = ReturnType<typeof Route.useSearch>
type EnrollmentsLoaderData = ReturnType<typeof Route.useLoaderData>
type EnrollmentsController = ReturnType<typeof useEnrollmentsPageController>
type ReviewState = ReturnType<typeof useEnrollmentReview>
type ReviewOverlayContext = NonNullable<EnrollmentsController['reviewOverlay']>

function useEnrollmentsNavigation(
  router: AppRouter,
  params: EnrollmentsSearch,
  loaderData: EnrollmentsLoaderData,
) {
  const { page, pageSize, search, sortBy, sortDir, viewAll } = params
  const [isListLoading, setIsListLoading] = useState(false)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const navigate = useCallback(
    (req: EnrollmentsNavRequest) => {
      const decision = resolveEnrollmentsNavigation(
        { page, pageSize, search, sortBy, sortDir },
        req,
      )
      if (decision.kind === 'noop') {
        setIsListLoading(false)
        return
      }
      setIsListLoading(true)
      router.navigate({
        to: '/enrollments',
        search: { ...decision.next, review: undefined, viewAll },
        replace: true,
        resetScroll: false,
      })
    },
    [router, page, pageSize, search, sortBy, sortDir, viewAll],
  )

  const handleSearchChange = useCallback(
    (s: string) => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
      const decision = resolveSearchChange(s, search)
      if (decision.kind === 'noop') {
        setIsListLoading(false)
        return
      }
      setIsListLoading(true)
      searchDebounceRef.current = setTimeout(
        () => navigate(decision.request),
        300,
      )
    },
    [navigate, search],
  )

  useEffect(() => {
    setIsListLoading(false)
  }, [loaderData.enrollments, loaderData.total, loaderData.evaluations])

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [])

  return { isListLoading, navigate, handleSearchChange }
}

function useEnrollmentsActions(router: AppRouter, params: EnrollmentsSearch) {
  const { pageSize, search, sortBy, sortDir, viewAll } = params
  const [isDistributing, setIsDistributing] = useState(false)
  const [isStartSubDialogOpen, setIsStartSubDialogOpen] = useState(false)
  const [isEndSubDialogOpen, setIsEndSubDialogOpen] = useState(false)
  const [isExportContactsDialogOpen, setIsExportContactsDialogOpen] =
    useState(false)
  const [isBulkGradeDialogOpen, setIsBulkGradeDialogOpen] = useState(false)
  const [isWhatsAppDialogOpen, setIsWhatsAppDialogOpen] = useState(false)
  const [isEmailCampaignDialogOpen, setIsEmailCampaignDialogOpen] =
    useState(false)

  const handleRefresh = () => void router.invalidate()

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
      toast.success(buildDistributeToastMessage(assigned))
      void router.invalidate()
    } catch (error) {
      toast.error(toUserError(error).message)
    } finally {
      setIsDistributing(false)
    }
  }

  return {
    isDistributing,
    isStartSubDialogOpen,
    setIsStartSubDialogOpen,
    isEndSubDialogOpen,
    setIsEndSubDialogOpen,
    isExportContactsDialogOpen,
    setIsExportContactsDialogOpen,
    isBulkGradeDialogOpen,
    setIsBulkGradeDialogOpen,
    isWhatsAppDialogOpen,
    setIsWhatsAppDialogOpen,
    isEmailCampaignDialogOpen,
    setIsEmailCampaignDialogOpen,
    handleRefresh,
    handleToggleViewAll,
    handleDistribute,
  }
}

function useEnrollmentsPageController() {
  const loaderData = Route.useLoaderData()
  const { enrollments, total, evaluations } = loaderData
  const { user } = Route.useRouteContext()
  const router = useRouter()
  const params = Route.useSearch()
  const { page, pageSize, search, sortBy, sortDir, review, viewAll } = params
  const isAdmin = resolveIsAdmin(user)

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

  const nav = useEnrollmentsNavigation(router, params, loaderData)
  const actions = useEnrollmentsActions(router, params)
  const reviewOverlay = resolveReviewOverlayContext({
    isOpen: reviewState.isOpen,
    current: reviewState.current,
    user,
  })

  return {
    enrollments,
    total,
    page,
    pageSize,
    search,
    sortBy,
    sortDir,
    isAdmin,
    router,
    reviewState,
    reviewOverlay,
    viewAllButton: getViewAllButtonProps(viewAll),
    ...nav,
    ...actions,
  }
}

type EnrollmentsPageHeaderProps = {
  viewAllButton: ReturnType<typeof getViewAllButtonProps>
  isAdmin: boolean
  isDistributing: boolean
  onToggleViewAll: () => void
  onDistribute: () => void
  onStartSubstitution: () => void
  onEndSubstitution: () => void
  onExportContacts: () => void
  onBulkGrade: () => void
  onSendWhatsApp: () => void
  onSendEmailCampaign: () => void
}

function EnrollmentsPageHeader({
  viewAllButton,
  isAdmin,
  isDistributing,
  onToggleViewAll,
  onDistribute,
  onStartSubstitution,
  onEndSubstitution,
  onExportContacts,
  onBulkGrade,
  onSendWhatsApp,
  onSendEmailCampaign,
}: EnrollmentsPageHeaderProps) {
  return (
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
          variant={viewAllButton.variant}
          onClick={onToggleViewAll}
        >
          <EyeIcon className="size-3.5" />
          {viewAllButton.label}
        </Button>
        {isAdmin && (
          <AdminActionsDropdown
            onDistribute={onDistribute}
            onStartSubstitution={onStartSubstitution}
            onEndSubstitution={onEndSubstitution}
            onExportContacts={onExportContacts}
            onBulkGrade={onBulkGrade}
            onSendWhatsApp={onSendWhatsApp}
            onSendEmailCampaign={onSendEmailCampaign}
            isDistributing={isDistributing}
          />
        )}
      </div>
    </div>
  )
}

function EnrollmentsTableSection({ c }: { c: EnrollmentsController }) {
  return (
    <EnrollmentsTable
      enrollments={c.enrollments}
      onRefresh={c.handleRefresh}
      onReview={c.reviewState.open}
      isAdmin={c.isAdmin}
      initialPage={c.page}
      pageSize={c.pageSize}
      rowCount={c.total}
      initialSearch={c.search}
      initialSortBy={c.sortBy}
      initialSortDir={c.sortDir}
      isLoading={c.isListLoading}
      onPageChange={(p) => c.navigate({ page: p })}
      onPageSizeChange={(ps) => c.navigate({ page: 1, pageSize: ps })}
      onSearchChange={c.handleSearchChange}
      onSortingChange={(by, dir) => c.navigate(buildSortChangeRequest(by, dir))}
    />
  )
}

type EnrollmentSubstitutionDialogsProps = {
  startOpen: boolean
  endOpen: boolean
  onStartOpenChange: (open: boolean) => void
  onEndOpenChange: (open: boolean) => void
  onSuccess: () => void
}

function EnrollmentSubstitutionDialogs({
  startOpen,
  endOpen,
  onStartOpenChange,
  onEndOpenChange,
  onSuccess,
}: EnrollmentSubstitutionDialogsProps) {
  return (
    <>
      <StartSubstitutionDialog
        open={startOpen}
        onOpenChange={onStartOpenChange}
        onSuccess={onSuccess}
      />
      <EndSubstitutionDialog
        open={endOpen}
        onOpenChange={onEndOpenChange}
        onSuccess={onSuccess}
      />
    </>
  )
}

type EnrollmentReviewOverlayProps = {
  overlay: ReviewOverlayContext
  reviewState: ReviewState
  isAdmin: boolean
  router: AppRouter
}

function EnrollmentReviewOverlay({
  overlay,
  reviewState,
  isAdmin,
  router,
}: EnrollmentReviewOverlayProps) {
  return (
    <EvaluationOverlay
      enrollment={overlay.enrollment}
      evaluations={reviewState.currentEvaluations}
      isAdmin={isAdmin}
      userId={overlay.userId}
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
          overlay.userId,
          overlay.evaluatorName,
          patch,
        )
      }
    />
  )
}

// Admin-only dialogs mounted alongside the page (bulk grade + WhatsApp send).
function EnrollmentAdminDialogs({ c }: { c: EnrollmentsController }) {
  return (
    <>
      <BulkGradeDialog
        open={c.isBulkGradeDialogOpen}
        onOpenChange={c.setIsBulkGradeDialogOpen}
        onSuccess={() => void c.router.invalidate()}
      />
      <WhatsAppCampaignDialog
        open={c.isWhatsAppDialogOpen}
        onOpenChange={c.setIsWhatsAppDialogOpen}
      />
      <EmailCampaignDialog
        open={c.isEmailCampaignDialogOpen}
        onOpenChange={c.setIsEmailCampaignDialogOpen}
      />
    </>
  )
}

function EnrollmentsPage() {
  const c = useEnrollmentsPageController()
  return (
    <PageLayout>
      <EnrollmentsPageHeader
        viewAllButton={c.viewAllButton}
        isAdmin={c.isAdmin}
        isDistributing={c.isDistributing}
        onToggleViewAll={c.handleToggleViewAll}
        onDistribute={() => void c.handleDistribute()}
        onStartSubstitution={() => c.setIsStartSubDialogOpen(true)}
        onEndSubstitution={() => c.setIsEndSubDialogOpen(true)}
        onExportContacts={() => c.setIsExportContactsDialogOpen(true)}
        onBulkGrade={() => c.setIsBulkGradeDialogOpen(true)}
        onSendWhatsApp={() => c.setIsWhatsAppDialogOpen(true)}
        onSendEmailCampaign={() => c.setIsEmailCampaignDialogOpen(true)}
      />

      <EnrollmentsTableSection c={c} />

      {c.isAdmin && (
        <EnrollmentSubstitutionDialogs
          startOpen={c.isStartSubDialogOpen}
          endOpen={c.isEndSubDialogOpen}
          onStartOpenChange={c.setIsStartSubDialogOpen}
          onEndOpenChange={c.setIsEndSubDialogOpen}
          onSuccess={() => void c.router.invalidate()}
        />
      )}

      {c.isAdmin && (
        <ExportContactsDialog
          open={c.isExportContactsDialogOpen}
          onOpenChange={c.setIsExportContactsDialogOpen}
        />
      )}

      {c.isAdmin && <EnrollmentAdminDialogs c={c} />}

      {c.reviewOverlay && (
        <EnrollmentReviewOverlay
          overlay={c.reviewOverlay}
          reviewState={c.reviewState}
          isAdmin={c.isAdmin}
          router={c.router}
        />
      )}
    </PageLayout>
  )
}
