import {
  resolveSessionPrivateImageUrl,
  setSessionPrivateImageCacheUser,
} from '@/hooks/useSessionPrivateImageUrl/cache'

export function useSessionPrivateImageUrl(
  value: string | null | undefined,
): string | null | undefined {
  if (typeof window === 'undefined') return value
  return resolveSessionPrivateImageUrl(value)
}

export function useSessionPrivateImageCacheUser(
  userId: string | null | undefined,
): void {
  if (typeof window !== 'undefined') setSessionPrivateImageCacheUser(userId)
}
