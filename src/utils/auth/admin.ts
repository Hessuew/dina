import { redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { profiles } from '@/db/schema'
import { getSupabaseServerClient } from '@/utils/supabase'

export const checkAdminAccess = createServerFn({ method: 'POST' }).handler(
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
