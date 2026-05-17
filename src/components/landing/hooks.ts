import { useState } from 'react'

export function useCarousel(itemCount: number) {
  const [activeIndex, setActiveIndex] = useState(0)

  const goToPrevious = () =>
    setActiveIndex((i) => (i === 0 ? itemCount - 1 : i - 1))

  const goToNext = () =>
    setActiveIndex((i) => (i === itemCount - 1 ? 0 : i + 1))

  return { activeIndex, setActiveIndex, goToPrevious, goToNext }
}
