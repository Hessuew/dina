export type LandingItemBase = {
  id: string
}

export type LandingShowcaseItem = LandingItemBase & {
  number: string
  title: string
  description?: string
}
