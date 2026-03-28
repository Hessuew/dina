import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '@/utils/supabase'

// Server function to get current user's profile
const getMyProfile = createServerFn({ method: 'GET' }).handler(async () => {
  // Dynamic import to keep database code server-only
  const { getUserProfile } = await import('@/utils/auth')

  // Get user from Supabase
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  // Get the user's profile from database
  const profile = await getUserProfile(user.id)

  return profile
})

export const Route = createFileRoute('/_authed/dashboard')({
  loader: async () => {
    const profile = await getMyProfile()
    return { profile }
  },
  component: DashboardComponent,
})

function DashboardComponent() {
  const { profile } = Route.useLoaderData()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Your Profile</h2>

        <div className="space-y-2">
          <p>
            <span className="font-medium">User ID:</span> {profile.id}
          </p>
          <p>
            <span className="font-medium">Name:</span> {profile.fullName}
          </p>
          <p>
            <span className="font-medium">Email:</span> {profile.email}
          </p>
          <p>
            <span className="font-medium">Role:</span>{' '}
            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded">
              {profile.role}
            </span>
          </p>
          {profile.avatarUrl && (
            <div>
              <span className="font-medium">Avatar:</span>
              <img
                src={profile.avatarUrl}
                alt={profile.fullName}
                className="w-16 h-16 rounded-full mt-2"
              />
            </div>
          )}
        </div>

        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded">
          <p className="text-sm text-green-800">
            ✅ Your profile is linked to your Supabase authentication!
          </p>
        </div>
      </div>
    </div>
  )
}
