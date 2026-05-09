import { useState } from 'react'
import { format } from 'date-fns'
import { CheckCircle2, Eye, Mail, MoreHorizontal, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { createColumnHelper } from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'
import { toUserError } from '@/utils/errors'
import facultyBackground from '@/assets/images/bg/bg_lecturers.webp'
import { Button } from '@/components/ui/button'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { DataTable } from '@/components/table/DataTable'
import { EnrollmentStatusChip } from '@/components/table/chips'
import { useMutation } from '@/hooks/useMutation'
import {
  deleteEnrollment,
  sendInvitationForEnrollment,
  updateEnrollmentStatus,
} from '@/utils/enrollments'
import { cn } from '@/lib/utils'

export type EnrollmentRow = {
  id: string
  fullLegalName: string
  preferredName: string | null
  email: string
  yearOfBirth: number
  gender: 'male' | 'female'
  nationalityCitizenship: string | null
  phoneWhatsApp: string
  currentCity: string | null
  currentCountry: string | null
  churchAffiliations: string | null
  aboutYourself: string
  expectationsAlignment: string
  status:
    | 'pending'
    | 'under_review'
    | 'approved'
    | 'rejected'
    | 'waitlisted'
    | 'withdrawn'
    | 'deferred'
  invitationSent: boolean
  invitationId: string | null
  createdAt: Date
  updatedAt: Date
}

type EnrollmentsTableProps = {
  enrollments: Array<EnrollmentRow>
  onRefresh: () => void
}

const columnHelper = createColumnHelper<EnrollmentRow>()

const STATUS_LABELS: Array<{ value: EnrollmentRow['status']; label: string }> =
  [
    { value: 'pending', label: 'Pending' },
    { value: 'under_review', label: 'Under review' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'waitlisted', label: 'Waitlisted' },
    { value: 'withdrawn', label: 'Withdrawn' },
    { value: 'deferred', label: 'Deferred' },
  ]

export function EnrollmentsTable({
  enrollments,
  onRefresh,
}: EnrollmentsTableProps) {
  const router = useRouter()

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<
    string | null
  >(null)

  const updateStatusFn = useServerFn(updateEnrollmentStatus)
  const deleteFn = useServerFn(deleteEnrollment)
  const sendInviteFn = useServerFn(sendInvitationForEnrollment)

  const updateStatusMutation = useMutation({
    fn: updateStatusFn,
    onSuccess: () => {
      toast.success('Status updated')
      onRefresh()
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
    columnHelper.accessor('fullLegalName', {
      cell: (info) => (
        <span className="font-medium text-[#F8F4EC]">{info.getValue()}</span>
      ),
      header: 'Full legal name',
    }),
    columnHelper.accessor('email', {
      cell: (info) => (
        <span className="text-[0.82rem] text-[#AFA28F]">{info.getValue()}</span>
      ),
      header: 'Email',
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
    columnHelper.accessor('gender', {
      cell: (info) => (
        <span className="text-[0.82rem] text-[#AFA28F]">
          {info.getValue() === 'male' ? 'Male' : 'Female'}
        </span>
      ),
      header: 'Gender',
    }),
    columnHelper.accessor('status', {
      cell: (info) => <EnrollmentStatusChip status={info.getValue()} />,
      header: 'Status',
    }),
    columnHelper.accessor('invitationSent', {
      cell: (info) => {
        const sent = info.getValue()
        return sent ? (
          <span className="inline-flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="size-3.5" />
            Sent
          </span>
        ) : (
          <span className="text-[#8E816D]">—</span>
        )
      },
      header: 'Invitation',
    }),
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
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    size="icon"
                    theme="dark"
                    className="size-8 rounded-none border-none bg-transparent hover:bg-white/5"
                    onClick={() =>
                      router.navigate({
                        to: '/enrollments/$enrollmentId',
                        params: { enrollmentId: row.id },
                      })
                    }
                  >
                    <Eye className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger>
                  <Button
                    size="icon"
                    theme="dark"
                    className="size-8 rounded-none border-none bg-transparent hover:bg-white/5"
                    onClick={() => {
                      setSelectedEnrollmentId(row.id)
                      setInviteDialogOpen(true)
                    }}
                    disabled={inviteMutation.status === 'pending'}
                  >
                    <Mail className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Send invitation</TooltipContent>
              </Tooltip>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      size="icon"
                      theme="dark"
                      className="size-8 rounded-none border-none bg-transparent hover:bg-white/5"
                    >
                      <MoreHorizontal className="size-3.5" />
                    </Button>
                  }
                />
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
            </div>
          </TooltipProvider>
        )
      },
    }),
  ]

  if (enrollments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <h3 className="mb-2 font-serif text-lg text-[#F8F4EC]">
          No enrollments yet
        </h3>
        <p className="text-sm text-[#8E816D]">
          Public enrolment form submissions show up here.
        </p>
      </div>
    )
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={enrollments}
        pageSize={10}
        searchPlaceholder="Search by name, email, status…"
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
                disabled={inviteMutation.status === 'pending'}
              >
                {inviteMutation.status === 'pending' ? 'Sending…' : 'Send'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
                Delete enrollment
              </DialogTitle>
              <DialogDescription className="text-[#AFA28F]">
                Delete this enrollment? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-6 rounded-none border-t border-white/8 bg-white/3 pt-6">
              <Button
                variant="outline"
                theme="dark"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="rounded-none"
                onClick={() => {
                  if (!selectedEnrollmentId) return
                  deleteMutation.mutate({
                    data: { enrollmentId: selectedEnrollmentId },
                  })
                }}
                disabled={deleteMutation.status === 'pending'}
              >
                {deleteMutation.status === 'pending' ? 'Deleting…' : 'Delete'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
