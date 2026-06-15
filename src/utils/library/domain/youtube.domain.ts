export function getYoutubeVideoId(url: string): string | null {
  try {
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`
    const u = new URL(normalized)
    if (u.hostname === 'youtu.be') return u.pathname.replace('/', '') || null
    if (u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com') {
      const v = u.searchParams.get('v')
      if (v) return v
      if (u.pathname.startsWith('/embed/')) {
        return u.pathname.split('/embed/')[1]?.split('/')[0] || null
      }
      if (u.pathname.startsWith('/shorts/')) {
        return u.pathname.split('/shorts/')[1]?.split('/')[0] || null
      }
    }
    return null
  } catch {
    return null
  }
}
