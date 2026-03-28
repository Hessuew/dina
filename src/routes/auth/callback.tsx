import { createFileRoute, redirect } from '@tanstack/react-router'
import { getSupabaseServerClient } from '@/utils/supabase'

const handleAuthCallback = async (searchParams: URLSearchParams) => {
  const supabase = getSupabaseServerClient()

  // Get the code from URL parameters
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  if (!code && !token_hash) {
    // No verification code provided
    throw redirect({
      to: '/login',
      search: { verified: false },
    })
  }

  try {
    // Exchange the code for a session
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('Verification error:', error)
        throw redirect({
          to: '/login',
          search: { verified: false },
        })
      }
    } else if (token_hash && type) {
      // Handle token hash verification (for email links)
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as any,
      })

      if (error) {
        console.error('OTP verification error:', error)
        throw redirect({
          to: '/login',
          search: { verified: false },
        })
      }
    }

    // Verification successful, redirect to dashboard with success message
    throw redirect({
      to: '/dashboard',
      search: { verified: true },
    })
  } catch (err) {
    // If it's already a redirect, re-throw it
    if (err && typeof err === 'object' && 'href' in err) {
      throw err
    }

    // Otherwise, redirect to login with error
    throw redirect({
      to: '/login',
      search: { verified: false },
    })
  }
}

export const Route = createFileRoute('/auth/callback')({
  beforeLoad: async ({ search }) => {
    // Convert search object to URLSearchParams
    const searchParams = new URLSearchParams(search as Record<string, string>)
    await handleAuthCallback(searchParams)
  },
  component: () => {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-gray-900"></div>
          <p className="text-gray-600">Verifying your email...</p>
        </div>
      </div>
    )
  },
})
