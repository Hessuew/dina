import { createServerFn } from '@tanstack/react-start'
import { LandingPublicHeader } from '@/components/landing/hero'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { getDb } from '@/db'
import { profiles } from '@/db/schema'
import { useMutation } from '@/hooks/useMutation'
import { getCurrentUser } from '@/utils/auth/auth'

type User = {
  id: string
  email: string
  fullName?: string
  avatarUrl?: string | null
  role?: 'student' | 'teacher' | 'admin'
}

type HeaderProps = {
  user: User | null
}

export const toggleUserRole = createServerFn({ method: 'POST' }).handler(
  async () => {
    const user = await getCurrentUser()

    const { eq } = await import('drizzle-orm')
    const db = await getDb()

    // Get current user role
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
      columns: {
        role: true,
      },
    })

    if (!profile) {
      throw new Error('User profile not found')
    }

    // Toggle role: teacher <-> student
    const newRole = profile.role === 'teacher' ? 'student' : 'teacher'

    // Update role in database
    await db
      .update(profiles)
      .set({ role: newRole })
      .where(eq(profiles.id, user.id))

    return { success: true, newRole }
  },
)

export function Header({ user }: HeaderProps) {
  const toggleRoleMutation = useMutation({
    fn: async () => {
      const result = await toggleUserRole()
      return result
    },
    onSuccess: () => {
      // Reload the page to refresh user context
      window.location.reload()
    },
  })

  if (!user) {
    return <LandingPublicHeader />
  }

  const handleToggleRole = () => {
    toggleRoleMutation.mutate({ user })
  }

  const isTeacher = user.role === 'teacher'
  const isStudent = user.role === 'student'

  return (
    <header className="absolute top-0 z-40 flex h-12 w-full shrink-0 flex-row items-center justify-between bg-transparent px-4">
      <SidebarTrigger className="-ml-1 text-[#C5A059] hover:text-[#D6B16E]" />

      {(isTeacher || isStudent) && (
        <Button
          onClick={handleToggleRole}
          disabled={toggleRoleMutation.isPending}
          variant="ghost"
          theme="dark"
          size="sm"
          className="text-xs text-[#C5A059] hover:bg-[#C5A059]/10 hover:text-[#D6B16E]"
        >
          {toggleRoleMutation.isPending
            ? 'Switching...'
            : isTeacher
              ? 'Switch to Student'
              : 'Switch to Teacher'}
        </Button>
      )}
    </header>
  )
}
