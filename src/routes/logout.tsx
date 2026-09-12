import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { logoutService } from '@/utils/auth/logout'

const logoutFn = createServerFn().handler(async () => {
  const result = await logoutService()

  if (result?.error) {
    return result
  }

  throw redirect({
    href: '/',
  })
})

export const Route = createFileRoute('/logout')({
  preload: false,
  loader: () => logoutFn(),
})
