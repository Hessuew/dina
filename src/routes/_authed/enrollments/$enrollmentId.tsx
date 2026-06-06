import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Mail, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
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
import { PageLayout } from '@/components/layout/page-layout'
import { PageHeader } from '@/components/layout/page-header'
import { EnrollmentDetails } from '@/components/enrollment/EnrollmentDetails'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { checkTeacherAccess } from '@/utils/auth/admin'
import {
  deleteEnrollment,
  getEnrollmentById,
  sendInvitationForEnrollment,
  updateEnrollmentStatus,
} from '@/utils/enrolment'
import { useEntityMutation } from '@/hooks/useEntityMutation'
import { useMutation } from '@/hooks/useMutation'

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'under_review', label: 'Under review' },
  { value: 'awaiting_approval', label: 'Awaiting approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'waitlisted', label: 'Waitlisted' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'deferred', label: 'Deferred' },
] as const

export const Route = createFileRoute('/_authed/enrollments/$enrollmentId')({
  beforeLoad: async () => {
    await checkTeacherAccess()
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

  const { deleteMutation } = useEntityMutation({
    deleteFn: deleteFn,
    onSuccessMessage: () => 'Enrollment deleted',
    onSuccess: () => {
      router.history.back()
    },
    invalidateRouter: false,
  })

  const { user } = Route.useRouteContext()
  const isAdmin = user?.role === 'admin'

  return (
    <PageLayout>
      <PageHeader
        title={enrollment.fullLegalName}
        onBack={() => router.history.back()}
        responsiveTitle={false}
        metadata={
          <p className="text-[0.72rem] font-medium tracking-[0.22em] text-[#8E816D] uppercase">
            Enrollment details
          </p>
        }
        actions={
          isAdmin ? (
            <>
              <Button
                theme="light"
                variant="outline"
                onClick={() => setInviteDialogOpen(true)}
                disabled={inviteMutation.isPending}
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
            </>
          ) : undefined
        }
      />

      <EnrollmentDetails
        enrollment={enrollment}
        isAdmin={isAdmin}
        statusAction={
          isAdmin ? (
            <Select
              value={enrollment.status}
              onValueChange={(value) =>
                statusMutation.mutate({
                  data: {
                    enrollmentId: enrollment.id,
                    status: value as (typeof STATUS_OPTIONS)[number]['value'],
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
          ) : undefined
        }
      />

      {isAdmin && (
        <>
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
            onConfirm={() =>
              deleteMutation.mutate({
                data: { enrollmentId: enrollment.id },
              })
            }
            isDeleting={deleteMutation.isPending}
          />
        </>
      )}
    </PageLayout>
  )
}
