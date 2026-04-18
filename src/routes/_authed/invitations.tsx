import { useState } from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InvitationsTable } from '@/components/table/InvitationsTable'
import { InviteUserModal } from '@/components/modal/InviteUserModal'
import { getSupabaseServerClient } from '@/utils/supabase'
import { db } from '@/db'
import { profiles } from '@/db/schema'
import { getInvitations } from '@/utils/invitations'

const checkAdminAccess = createServerFn({ method: 'GET' }).handler(async () => {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw redirect({ href: '/login' })
  }

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
  })

  if (profile?.role !== 'admin') {
    throw redirect({ href: '/dashboard' })
  }

  return { isAdmin: true }
})

export const Route = createFileRoute('/_authed/invitations')({
  beforeLoad: async () => {
    await checkAdminAccess()
  },
  loader: async () => {
    const result = await getInvitations()
    if (result.error) {
      return { invitations: [] }
    }
    return { invitations: result.invitations }
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
    <div className="mx-auto w-full max-w-7xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage user invitations and access control
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite User
        </Button>
      </div>

      <InvitationsTable invitations={invitations} onRefresh={handleRefresh} />

      <InviteUserModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={handleRefresh}
      />
    </div>
  )
}
