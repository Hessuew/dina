import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InvitationsTable } from '@/components/table/InvitationsTable'
import { InviteUserModal } from '@/components/dialog/InviteUserModal'
import { PageLayout } from '@/components/layout/page-layout'
import { checkAdminAccess } from '@/utils/auth/admin'
import { getInvitations } from '@/utils/invitation'

export const Route = createFileRoute('/_authed/invitations')({
  beforeLoad: async () => {
    await checkAdminAccess()
  },
  loader: async () => {
    const result = await getInvitations()
    return result
  },
  component: InvitationsPage,
})

function InvitationsPage() {
  const { invitations } = Route.useLoaderData()
  const [modalOpen, setModalOpen] = useState(false)
  const router = useRouter()

  const handleRefresh = () => {
    router.invalidate()
  }

  return (
    <PageLayout>
      <div className="mb-10 flex items-end justify-between gap-6">
        <div>
          <div className="h-px w-10 bg-[#C5A059]/50" />
          <h1 className="mt-3 font-serif text-3xl tracking-[-0.02em] text-[#1C1815]">
            User Management
          </h1>
          <p className="mt-2 text-[0.72rem] font-medium tracking-[0.22em] text-[#8E816D] uppercase">
            Manage user invitations and access control
          </p>
        </div>
        <Button theme="light" onClick={() => setModalOpen(true)}>
          <UserPlus className="size-3.5" />
          Invite User
        </Button>
      </div>

      <InvitationsTable invitations={invitations} onRefresh={handleRefresh} />

      <InviteUserModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={handleRefresh}
      />
    </PageLayout>
  )
}
