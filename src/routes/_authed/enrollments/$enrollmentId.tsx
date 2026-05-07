import { createFileRoute, useRouter } from '@tanstack/react-router'
import { ChevronLeft, Mail, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
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
import { EnrollmentStatusChip } from '@/components/table/chips'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { checkAdminAccess } from '@/utils/auth/admin'
import {
  deleteEnrollment,
  getEnrollmentById,
  sendInvitationForEnrollment,
  updateEnrollmentStatus,
} from '@/utils/enrolment'
import { useMutation } from '@/hooks/useMutation'

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'under_review', label: 'Under review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'waitlisted', label: 'Waitlisted' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'deferred', label: 'Deferred' },
] as const

export const Route = createFileRoute('/_authed/enrollments/$enrollmentId')({
  beforeLoad: async () => {
    await checkAdminAccess()
  },
  loader: async ({ params }) => {
    const result = await getEnrollmentById({
      data: { enrollmentId: params.enrollmentId },
    })
    return result
  },
  component: EnrollmentDetailPage,
})

function EnrollmentDetailPage() {
  const router = useRouter()
  const { enrollment } = Route.useLoaderData()

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const updateStatusFn = useServerFn(updateEnrollmentStatus)
  const sendInviteFn = useServerFn(sendInvitationForEnrollment)
  const deleteFn = useServerFn(deleteEnrollment)

  const statusMutation = useMutation({
    fn: updateStatusFn,
    onSuccess: () => {
      toast.success('Status updated')
      router.invalidate()
    },
  })

  const inviteMutation = useMutation({
    fn: sendInviteFn,
    onSuccess: () => {
      toast.success('Invitation sent')
      setInviteDialogOpen(false)
      router.invalidate()
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
      router.navigate({ to: '/enrollments' })
    },
  })

  const address = [enrollment.currentCity, enrollment.currentCountry]
    .filter(Boolean)
    .join(', ')

  return (
    <div
      className="relative isolate min-h-screen overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0.92), rgba(255,255,255,0.92)), url(${facultyBackground})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(197,160,89,0.10),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.22),transparent_22%)]" />
      <div className="relative mx-auto max-w-5xl px-6 py-10 sm:px-8 sm:py-12">
        <Button
          variant="ghost"
          theme="light"
          size="sm"
          className="mb-6 gap-1"
          onClick={() => router.navigate({ to: '/enrollments' })}
        >
          <ChevronLeft className="size-3.5" />
          Back
        </Button>

        <div className="mb-8 flex flex-col gap-3">
          <div className="h-px w-10 bg-[#C5A059]/50" />
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl tracking-[-0.02em] text-[#1C1815]">
                {enrollment.fullLegalName}
              </h1>
              <p className="mt-2 text-[0.72rem] font-medium tracking-[0.22em] text-[#8E816D] uppercase">
                Enrollment details
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                theme="light"
                variant="outline"
                onClick={() => setInviteDialogOpen(true)}
                disabled={inviteMutation.status === 'pending'}
              >
                <Mail className="size-3.5" />
                Send invitation
              </Button>
              <Button
                variant="destructive"
                className="rounded-none"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        <div className="border border-white/10 bg-[#151515]/88 p-6 shadow-[0_22px_44px_-28px_rgba(0,0,0,0.6)]">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <div className="text-[0.68rem] font-medium tracking-[0.22em] text-[#8E816D] uppercase">
                Status
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <EnrollmentStatusChip status={enrollment.status} />
                <Select
                  value={enrollment.status}
                  onValueChange={(value) =>
                    statusMutation.mutate({
                      data: {
                        enrollmentId: enrollment.id,
                        status: value as any,
                      },
                    })
                  }
                >
                  <SelectTrigger className="h-9 rounded-none border-white/12 bg-[#1A1716] text-[#F8F4EC]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-white/10 bg-[#1A1716] text-[#F8F4EC]">
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="text-[0.68rem] font-medium tracking-[0.22em] text-[#8E816D] uppercase">
                Submitted
              </div>
              <div className="mt-2 text-sm text-[#D6CCBE]">
                {format(new Date(enrollment.createdAt), 'MMM d, yyyy')}
              </div>
            </div>

            <div>
              <div className="text-[0.68rem] font-medium tracking-[0.22em] text-[#8E816D] uppercase">
                Preferred name
              </div>
              <div className="mt-2 text-sm text-[#D6CCBE]">
                {enrollment.preferredName || '—'}
              </div>
            </div>

            <div>
              <div className="text-[0.68rem] font-medium tracking-[0.22em] text-[#8E816D] uppercase">
                Email
              </div>
              <div className="mt-2 text-sm text-[#D6CCBE]">
                {enrollment.email}
              </div>
            </div>

            <div>
              <div className="text-[0.68rem] font-medium tracking-[0.22em] text-[#8E816D] uppercase">
                WhatsApp
              </div>
              <div className="mt-2 text-sm text-[#D6CCBE]">
                {enrollment.phoneWhatsApp}
              </div>
            </div>

            <div>
              <div className="text-[0.68rem] font-medium tracking-[0.22em] text-[#8E816D] uppercase">
                Year of birth
              </div>
              <div className="mt-2 text-sm text-[#D6CCBE]">
                {enrollment.yearOfBirth}
              </div>
            </div>

            <div>
              <div className="text-[0.68rem] font-medium tracking-[0.22em] text-[#8E816D] uppercase">
                Gender
              </div>
              <div className="mt-2 text-sm text-[#D6CCBE]">
                {enrollment.gender === 'male' ? 'Male' : 'Female'}
              </div>
            </div>

            <div>
              <div className="text-[0.68rem] font-medium tracking-[0.22em] text-[#8E816D] uppercase">
                Nationality/citizenship
              </div>
              <div className="mt-2 text-sm text-[#D6CCBE]">
                {enrollment.nationalityCitizenship || '—'}
              </div>
            </div>

            <div>
              <div className="text-[0.68rem] font-medium tracking-[0.22em] text-[#8E816D] uppercase">
                Current address
              </div>
              <div className="mt-2 text-sm text-[#D6CCBE]">
                {address || '—'}
              </div>
            </div>

            <div className="sm:col-span-2">
              <div className="text-[0.68rem] font-medium tracking-[0.22em] text-[#8E816D] uppercase">
                Church affiliations
              </div>
              <div className="mt-2 text-sm leading-7 whitespace-pre-wrap text-[#D6CCBE]">
                {enrollment.churchAffiliations || '—'}
              </div>
            </div>

            <div className="sm:col-span-2">
              <div className="text-[0.68rem] font-medium tracking-[0.22em] text-[#8E816D] uppercase">
                About
              </div>
              <div className="mt-2 text-sm leading-7 whitespace-pre-wrap text-[#D6CCBE]">
                {enrollment.aboutYourself}
              </div>
            </div>

            <div className="sm:col-span-2">
              <div className="text-[0.68rem] font-medium tracking-[0.22em] text-[#8E816D] uppercase">
                Expectations
              </div>
              <div className="mt-2 text-sm leading-7 whitespace-pre-wrap text-[#D6CCBE]">
                {enrollment.expectationsAlignment}
              </div>
            </div>
          </div>
        </div>

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
                  Send invitation now?
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
                  onClick={() =>
                    inviteMutation.mutate({
                      data: { enrollmentId: enrollment.id },
                    })
                  }
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
                  onClick={() =>
                    deleteMutation.mutate({
                      data: { enrollmentId: enrollment.id },
                    })
                  }
                  disabled={deleteMutation.status === 'pending'}
                >
                  {deleteMutation.status === 'pending' ? 'Deleting…' : 'Delete'}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
