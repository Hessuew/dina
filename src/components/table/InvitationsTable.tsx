import { useState } from 'react'
import { format } from 'date-fns'
import { Mail, Shield, Trash2, UserX } from 'lucide-react'
import { toast } from 'sonner'
import { useServerFn } from '@tanstack/react-start'
import { createColumnHelper } from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'
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
import { DataTable, createButtonColumn } from '@/components/table/DataTable'
import { InvitationStatusChip, RoleChip } from '@/components/table/chips'
import { useMutation } from '@/hooks/useMutation'
import {
  deleteInvitation,
  resendInvitation,
  revokeInvitation,
} from '@/utils/invitations'

type Invitation = {
  id: string
  email: string
  role: 'student' | 'teacher' | 'admin'
  status: 'pending' | 'accepted' | 'revoked'
  invitedAt: Date
  acceptedAt: Date | null
  inviter: {
    fullName: string
    email: string
  }
}

type InvitationsTableProps = {
  invitations: Array<Invitation>
  onRefresh: () => void
}

const columnHelper = createColumnHelper<Invitation>()

export function InvitationsTable({
  invitations,
  onRefresh,
}: InvitationsTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedInvitationId, setSelectedInvitationId] = useState<
    string | null
  >(null)

  const resendFn = useServerFn(resendInvitation)
  const revokeFn = useServerFn(revokeInvitation)
  const deleteFn = useServerFn(deleteInvitation)

  const resendMutation = useMutation({
    fn: resendFn,
    onSuccess: () => {
      toast.success('Invitation resent successfully')
      onRefresh()
    },
  })

  const revokeMutation = useMutation({
    fn: revokeFn,
    onSuccess: () => {
      toast.success('Invitation revoked')
      onRefresh()
    },
  })

  const deleteMutation = useMutation({
    fn: deleteFn,
    onSuccess: () => {
      toast.success('Invitation deleted')
      setDeleteDialogOpen(false)
      setSelectedInvitationId(null)
      onRefresh()
    },
  })

  const columns: Array<ColumnDef<Invitation, any>> = [
    columnHelper.accessor('email', {
      cell: (info) => (
        <span className="font-medium text-[#F8F4EC]">{info.getValue()}</span>
      ),
      header: 'Email',
    }),
    columnHelper.accessor('role', {
      cell: (info) => <RoleChip role={info.getValue()} />,
      header: 'Role',
    }),
    columnHelper.accessor('status', {
      cell: (info) => <InvitationStatusChip status={info.getValue()} />,
      header: 'Status',
    }),
    columnHelper.accessor('inviter', {
      cell: (info) => {
        const inviter = info.getValue()
        return (
          <div className="flex flex-col gap-0.5">
            {inviter.fullName}
            <span className="text-[0.72rem] text-[#8E816D]">
              {inviter.email}
            </span>
          </div>
        )
      },
      enableSorting: false,
      header: 'Invited By',
    }),
    columnHelper.accessor('invitedAt', {
      cell: (info) => format(new Date(info.getValue()), 'MMM d, yyyy'),
      header: 'Invited At',
    }),
    columnHelper.accessor('acceptedAt', {
      cell: (info) => {
        const val = info.getValue()
        return val ? format(new Date(val), 'MMM d, yyyy') : '—'
      },
      header: 'Accepted At',
    }),
    createButtonColumn([
      {
        icon: Mail,
        label: 'Resend',
        onClick: (invitation) =>
          resendMutation.mutate({ data: { id: invitation.id } }),
        show: (invitation) => invitation.status === 'pending',
      },
      {
        icon: UserX,
        label: 'Revoke',
        onClick: (invitation) =>
          revokeMutation.mutate({ data: { id: invitation.id } }),
        show: (invitation) => invitation.status === 'pending',
      },
      {
        icon: Trash2,
        label: 'Delete',
        onClick: (invitation) => {
          setSelectedInvitationId(invitation.id)
          setDeleteDialogOpen(true)
        },
      },
    ]),
  ]

  if (invitations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Shield className="mb-4 size-12 text-[#8E816D]" />
        <h3 className="mb-2 font-serif text-lg text-[#F8F4EC]">
          No invitations yet
        </h3>
        <p className="text-sm text-[#8E816D]">
          Click &quot;Invite User&quot; to send your first invitation
        </p>
      </div>
    )
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={invitations}
        pageSize={10}
        searchPlaceholder="Search by email, role, status…"
      />

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
              <div className="mb-1">
                <div className="h-px w-8 bg-[#C5A059]/40" />
                <div className="mt-2 text-[0.68rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                  Confirm action
                </div>
              </div>
              <DialogTitle className="font-serif text-xl tracking-[-0.02em] text-[#F8F4EC]">
                Delete Invitation
              </DialogTitle>
              <DialogDescription className="text-[#AFA28F]">
                Are you sure you want to delete this invitation? This action
                cannot be undone.
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
                  if (selectedInvitationId) {
                    deleteMutation.mutate({
                      data: { id: selectedInvitationId },
                    })
                  }
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
