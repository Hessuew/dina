import { useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { format } from 'date-fns'
import { Mail, MoreVertical, Shield, Trash2, UserX } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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

  const handleResend = (id: string) => {
    resendMutation.mutate({ data: { id } })
  }

  const handleRevoke = (id: string) => {
    revokeMutation.mutate({ data: { id } })
  }

  const handleDeleteClick = (id: string) => {
    setSelectedInvitationId(id)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (selectedInvitationId) {
      deleteMutation.mutate({ data: { id: selectedInvitationId } })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
            Pending
          </Badge>
        )
      case 'accepted':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700">
            Accepted
          </Badge>
        )
      case 'revoked':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700">
            Revoked
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'student':
        return <Badge variant="secondary">Student</Badge>
      case 'teacher':
        return (
          <Badge variant="secondary" className="bg-purple-100 text-purple-700">
            Teacher
          </Badge>
        )
      case 'admin':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            Admin
          </Badge>
        )
      default:
        return <Badge variant="secondary">{role}</Badge>
    }
  }

  if (invitations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Shield className="text-muted-foreground mb-4 h-12 w-12" />
        <h3 className="mb-2 text-lg font-semibold">No invitations yet</h3>
        <p className="text-muted-foreground">
          Click &quot;Invite User&quot; to send your first invitation
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Invited By</TableHead>
              <TableHead>Invited At</TableHead>
              <TableHead>Accepted At</TableHead>
              <TableHead className="w-[70px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.map((invitation) => (
              <TableRow key={invitation.id}>
                <TableCell className="font-medium">
                  {invitation.email}
                </TableCell>
                <TableCell>{getRoleBadge(invitation.role)}</TableCell>
                <TableCell>{getStatusBadge(invitation.status)}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm">
                      {invitation.inviter.fullName}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {invitation.inviter.email}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {format(new Date(invitation.invitedAt), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  {invitation.acceptedAt
                    ? format(new Date(invitation.acceptedAt), 'MMM d, yyyy')
                    : '-'}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {invitation.status === 'pending' && (
                        <>
                          <DropdownMenuItem
                            onClick={() => handleResend(invitation.id)}
                          >
                            <Mail className="mr-2 h-4 w-4" />
                            Resend Invitation
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleRevoke(invitation.id)}
                          >
                            <UserX className="mr-2 h-4 w-4" />
                            Revoke
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(invitation.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this invitation? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
