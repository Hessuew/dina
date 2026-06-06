import { useState } from 'react'
import { format } from 'date-fns'
import { Eye, Mail, MoreHorizontal, Star, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useServerFn } from '@tanstack/react-start'
import { createColumnHelper } from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'
import type {
  EnrollmentStatus,
  EnrollmentWithEvaluation,
} from '@/utils/enrolment/domain/enrolment.domain'
import { toUserError } from '@/utils/errors'
import { Button } from '@/components/ui/button'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import facultyBackground from '@/assets/images/bg/bg_lecturers.webp'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TooltipProvider } from '@/components/ui/tooltip'
import { DataTable } from '@/components/table/DataTable'
import { IconButton } from '@/components/table/IconButton'
import { EnrollmentStatusChip, PeerReviewChip } from '@/components/table/chips'
import { useMutation } from '@/hooks/useMutation'
import {
  deleteEnrollment,
  sendInvitationForEnrollment,
  setEnrollmentSpecialCase,
  updateEnrollmentStatus,
} from '@/utils/enrolment/enrollments'
import { formatEvaluationSummary } from '@/utils/enrolment/domain/evaluation.domain'
import { cn } from '@/lib/utils'

export type EnrollmentRow = EnrollmentWithEvaluation

type EnrollmentsTableProps = {
  enrollments: Array<EnrollmentRow>
  onRefresh: () => void
  onReview: (enrollmentId: string) => void
  isAdmin: boolean
  initialPage?: number
  pageSize?: number
  rowCount?: number
  initialSearch?: string
  initialSortBy?: string
  initialSortDir?: 'asc' | 'desc'
  isLoading?: boolean
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  onSearchChange?: (search: string) => void
  onSortingChange?: (sortBy: string | null, sortDir: 'asc' | 'desc') => void
}

const columnHelper = createColumnHelper<EnrollmentRow>()

const STATUS_LABELS: Array<{ value: EnrollmentStatus; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'under_review', label: 'Under review' },
  { value: 'awaiting_approval', label: 'Awaiting approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'waitlisted', label: 'Waitlisted' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'deferred', label: 'Deferred' },
]

export function EnrollmentsTable({
  enrollments,
  onRefresh,
  onReview,
  isAdmin,
  initialPage,
  pageSize,
  rowCount,
  initialSearch,
  initialSortBy,
  initialSortDir,
  isLoading = false,
  onPageChange,
  onPageSizeChange,
  onSearchChange,
  onSortingChange,
}: EnrollmentsTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<
    string | null
  >(null)

  const updateStatusFn = useServerFn(updateEnrollmentStatus)
  const deleteFn = useServerFn(deleteEnrollment)
  const sendInviteFn = useServerFn(sendInvitationForEnrollment)
  const specialCaseFn = useServerFn(setEnrollmentSpecialCase)

  const updateStatusMutation = useMutation({
    fn: updateStatusFn,
    onSuccess: () => {
      toast.success('Status updated')
      onRefresh()
    },
  })

  const specialCaseMutation = useMutation({
    fn: specialCaseFn,
    onSuccess: () => {
      onRefresh()
    },
    onError: (error) => {
      toast.error(toUserError(error).message)
    },
  })

  const deleteMutation = useMutation({
    fn: deleteFn,
    onSuccess: () => {
      toast.success('Enrollment deleted')
      setDeleteDialogOpen(false)
      setSelectedEnrollmentId(null)
      onRefresh()
    },
  })

  const inviteMutation = useMutation({
    fn: sendInviteFn,
    onSuccess: () => {
      toast.success('Invitation sent')
      setInviteDialogOpen(false)
      setSelectedEnrollmentId(null)
      onRefresh()
    },
    onError: (error) => {
      toast.error(toUserError(error).message)
    },
  })

  const columns: Array<ColumnDef<EnrollmentRow, any>> = [
    columnHelper.accessor('specialCase', {
      enableSorting: false,
      header: '',
      cell: (info) => {
        const row = info.row.original
        const on = info.getValue()
        const star = (
          <Star
            className={cn(
              'size-3.5',
              on ? 'fill-amber-400 text-amber-400' : 'text-[#8E816D]',
            )}
          />
        )
        if (!isAdmin) return star
        return (
          <Button
            type="button"
            size="icon"
            theme="dark"
            onClick={() =>
              specialCaseMutation.mutate({
                data: { enrollmentId: row.id, specialCase: !on },
              })
            }
            disabled={specialCaseMutation.isPending}
            aria-label={on ? 'Unmark special case' : 'Mark special case'}
            className="size-8 rounded-none border-none bg-transparent hover:bg-amber-400/15"
          >
            {star}
          </Button>
        )
      },
    }),
    columnHelper.accessor('fullLegalName', {
      cell: (info) => (
        <span className="font-medium text-[#F8F4EC]">{info.getValue()}</span>
      ),
      header: 'Full legal name',
    }),
    columnHelper.accessor('nationalityCitizenship', {
      cell: (info) => {
        const val = info.getValue()
        return val ? (
          <span className="text-[0.82rem] text-[#AFA28F]">{val}</span>
        ) : (
          <span className="text-[#8E816D]">—</span>
        )
      },
      header: 'Nationality',
    }),
    columnHelper.accessor('yearOfBirth', {
      cell: (info) => (
        <span className="text-[0.82rem] text-[#AFA28F]">{info.getValue()}</span>
      ),
      header: 'YOB',
    }),
    columnHelper.accessor('evaluationSum', {
      cell: (info) => {
        const count = info.row.original.evaluationCount
        return count === 0 ? (
          <span className="text-[#8E816D]">—</span>
        ) : (
          <span className="text-[#D6CCBE] tabular-nums">
            {formatEvaluationSummary(info.getValue(), count)}
          </span>
        )
      },
      header: 'Score',
    }),
    columnHelper.accessor('peerReviewState', {
      enableSorting: false,
      cell: (info) => {
        const state = info.getValue()
        return state ? (
          <PeerReviewChip state={state} />
        ) : (
          <span className="text-[#8E816D]">—</span>
        )
      },
      header: 'Peer review',
    }),
    columnHelper.accessor('status', {
      cell: (info) => <EnrollmentStatusChip status={info.getValue()} />,
      header: 'Status',
    }),
    // ...(isAdmin
    //   ? [
    //       columnHelper.accessor('invitationSent', {
    //         cell: (info) => {
    //           const sent = info.getValue()
    //           return sent ? (
    //             <span className="inline-flex items-center gap-1.5 text-emerald-400">
    //               <CheckCircle2 className="size-3.5" />
    //               Sent
    //             </span>
    //           ) : (
    //             <span className="text-[#8E816D]">—</span>
    //           )
    //         },
    //         header: 'Invitation',
    //       }),
    //     ]
    //   : []),
    columnHelper.accessor('createdAt', {
      cell: (info) => format(new Date(info.getValue()), 'MMM d, yyyy'),
      header: 'Submitted',
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: (info) => {
        const row = info.row.original
        return (
          <TooltipProvider delay={200}>
            <div className="flex items-center justify-end gap-1">
              <IconButton
                icon={() => <Eye className="size-3.5" />}
                label="Review"
                onClick={() => onReview(row.id)}
              />

              {isAdmin && (
                <>
                  {row.status === 'approved' && (
                    <IconButton
                      icon={Mail}
                      label="Send invitation"
                      onClick={() => {
                        setSelectedEnrollmentId(row.id)
                        setInviteDialogOpen(true)
                      }}
                      disabled={inviteMutation.isPending}
                    />
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <IconButton
                        icon={MoreHorizontal}
                        label="More options"
                        onClick={() => {}}
                      />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="rounded-none border border-white/10 bg-[#1A1716] text-[#F8F4EC]"
                    >
                      {STATUS_LABELS.map((s) => (
                        <DropdownMenuItem
                          key={s.value}
                          onClick={() =>
                            updateStatusMutation.mutate({
                              data: { enrollmentId: row.id, status: s.value },
                            })
                          }
                          className={cn(
                            'flex items-center justify-between',
                            s.value === row.status && 'text-[#C5A059]',
                          )}
                        >
                          {s.label}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => {
                          setSelectedEnrollmentId(row.id)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          </TooltipProvider>
        )
      },
    }),
  ]

  return (
    <>
      <DataTable
        columns={columns}
        data={enrollments}
        pageSize={pageSize ?? 10}
        initialPage={initialPage}
        maxRows={10}
        rowCount={rowCount}
        initialSearch={initialSearch}
        initialSortBy={initialSortBy}
        initialSortDir={initialSortDir}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        onSearchChange={onSearchChange}
        onSortingChange={onSortingChange}
        isLoading={isLoading}
        rowClassName={(row) =>
          row.specialCase ? 'bg-amber-400/10 hover:bg-amber-400/15' : ''
        }
        loadingLabel="Loading enrollments…"
        emptyMessage={
          initialSearch?.trim()
            ? 'No matching enrollments'
            : 'No enrollments yet. Public enrolment form submissions show up here.'
        }
        searchPlaceholder="Search by name, status…"
      />

      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent
          className="rounded-none border border-white/10 text-[#F8F4EC] shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)]"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(10,10,11,0.9), rgba(16,16,17,0.95)), url(${facultyBackground})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
          showCloseButton={false}
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_38%,rgba(197,160,89,0.08)_100%)]" />
          <div className="relative">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl tracking-[-0.02em] text-[#F8F4EC]">
                Send invitation
              </DialogTitle>
              <DialogDescription className="text-[#AFA28F]">
                Send invitation now? If pending invite already exist, we resend
                it.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-6 rounded-none border-t border-white/8 bg-white/3 pt-6">
              <Button
                variant="outline"
                theme="dark"
                onClick={() => setInviteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                theme="dark"
                onClick={() => {
                  if (!selectedEnrollmentId) return
                  inviteMutation.mutate({
                    data: { enrollmentId: selectedEnrollmentId },
                  })
                }}
                disabled={inviteMutation.isPending}
              >
                {inviteMutation.isPending ? 'Sending…' : 'Send'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        entityName="Enrollment"
        onConfirm={() => {
          if (!selectedEnrollmentId) return
          deleteMutation.mutate({
            data: { enrollmentId: selectedEnrollmentId },
          })
        }}
        isDeleting={deleteMutation.isPending}
      />
    </>
  )
}
