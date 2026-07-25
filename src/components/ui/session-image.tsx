import type { ComponentProps } from 'react'
import { useSessionPrivateImageUrl } from '@/hooks/useSessionPrivateImageUrl'

export function SessionImage({
  src,
  ...props
}: ComponentProps<'img'>): React.JSX.Element {
  const sessionSrc = useSessionPrivateImageUrl(src)
  return <img src={sessionSrc ?? undefined} {...props} />
}
