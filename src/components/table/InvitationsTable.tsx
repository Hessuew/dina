import { useState } from 'react'
import { format } from 'date-fns'
import { Mail, Shield, Trash2, UserX } from 'lucide-react'
import { toast } from 'sonner'
import { useServerFn } from '@tanstack/react-start'
import { createColumnHelper } from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import { DataTable, createButtonColumn } from '@/components/table/DataTable'
import { InvitationStatusChip, RoleChip } from '@/components/table/chips'
import { useMutation } from '@/hooks/useMutation'
import {
  deleteInvitation,
  resendInvitation,
  revokeInvitation,
} from '@/utils/invitation'

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

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        entityName="Invitation"
        onConfirm={() => {
          if (selectedInvitationId) {
            deleteMutation.mutate({
              data: { id: selectedInvitationId },
            })
          }
        }}
        isDeleting={deleteMutation.isPending}
      />
    </>
  )
}
