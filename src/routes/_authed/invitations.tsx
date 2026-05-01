import { useState } from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { UserPlus } from 'lucide-react'
import facultyBackground from '@/assets/images/bg/bg_lecturers.webp'
import { Button } from '@/components/ui/button'
import { InvitationsTable } from '@/components/table/InvitationsTable'
import { InviteUserModal } from '@/components/modal/InviteUserModal'
import { getSupabaseServerClient } from '@/utils/supabase'
import { getDb } from '@/db'
import { profiles } from '@/db/schema'
import { getInvitations } from '@/utils/invitations'

const checkAdminAccess = createServerFn({ method: 'POST' }).handler(
  async () => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw redirect({ href: '/login' })
    }

    const db = await getDb()
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    })

    if (profile?.role !== 'admin') {
      throw redirect({ href: '/dashboard' })
    }

    return { isAdmin: true }
  },
)

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
    <div
      className="relative isolate min-h-screen overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0.92), rgba(255,255,255,0.92)), url(${facultyBackground})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(197,160,89,0.10),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.22),transparent_22%)]" />
      <div className="relative mx-auto max-w-7xl px-6 py-10 sm:px-8 sm:py-12">
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
      </div>
    </div>
  )
}
