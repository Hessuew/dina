import { useEffect, useRef, useState } from 'react'
import type {
  Dispatch,
  PointerEvent as ReactPointerEvent,
  RefObject,
  SetStateAction,
} from 'react'
import {
  clampPdfZoom,
  resolvePdfPinchZoom,
} from '@/components/library/pdf-viewer.domain'

type Point = { x: number; y: number }
type PinchStart = {
  distance: number
  zoom: number
  focusX: number
  focusY: number
}

function pairMetrics([first, second]: [Point, Point]) {
  const x = second.x - first.x
  const y = second.y - first.y
  return {
    distance: Math.hypot(x, y),
    centerX: (first.x + second.x) / 2,
    centerY: (first.y + second.y) / 2,
  }
}

function firstPair(points: Map<number, Point>): [Point, Point] | null {
  const pair = Array.from(points.values()).slice(0, 2)
  return pair.length === 2 ? [pair[0], pair[1]] : null
}

type GestureRefs = {
  viewport: RefObject<HTMLDivElement | null>
  points: RefObject<Map<number, Point>>
  pinch: RefObject<PinchStart | null>
}

function updatePointer(
  event: ReactPointerEvent<HTMLDivElement>,
  points: Map<number, Point>,
): boolean {
  if (!points.has(event.pointerId)) return false
  points.set(event.pointerId, { x: event.clientX, y: event.clientY })
  return true
}

function getActivePinch(refs: GestureRefs) {
  const pair = firstPair(refs.points.current)
  const pinch = refs.pinch.current
  const viewport = refs.viewport.current
  if (!pair || !pinch || !viewport) return null
  return { pair, pinch, viewport }
}

function startPinch(
  event: ReactPointerEvent<HTMLDivElement>,
  refs: GestureRefs,
  zoom: number,
) {
  refs.points.current.set(event.pointerId, {
    x: event.clientX,
    y: event.clientY,
  })
  const pair = firstPair(refs.points.current)
  const viewport = refs.viewport.current
  if (!pair || !viewport) return
  const metrics = pairMetrics(pair)
  const rect = viewport.getBoundingClientRect()
  refs.pinch.current = {
    distance: metrics.distance,
    zoom,
    focusX: (viewport.scrollLeft + metrics.centerX - rect.left) / zoom,
    focusY: (viewport.scrollTop + metrics.centerY - rect.top) / zoom,
  }
}

function movePinch(
  event: ReactPointerEvent<HTMLDivElement>,
  refs: GestureRefs,
  setZoom: Dispatch<SetStateAction<number>>,
) {
  if (!updatePointer(event, refs.points.current)) return
  const active = getActivePinch(refs)
  if (!active) return
  const { pair, pinch, viewport } = active
  event.preventDefault()
  const metrics = pairMetrics(pair)
  const nextZoom = resolvePdfPinchZoom(
    pinch.zoom,
    pinch.distance,
    metrics.distance,
  )
  const rect = viewport.getBoundingClientRect()
  setZoom(nextZoom)
  requestAnimationFrame(() => {
    viewport.scrollLeft =
      pinch.focusX * nextZoom - (metrics.centerX - rect.left)
    viewport.scrollTop = pinch.focusY * nextZoom - (metrics.centerY - rect.top)
  })
}

function endPinch(event: ReactPointerEvent<HTMLDivElement>, refs: GestureRefs) {
  refs.points.current.delete(event.pointerId)
  if (refs.points.current.size < 2) refs.pinch.current = null
}

export function usePdfZoom(
  viewportRef: RefObject<HTMLDivElement | null>,
  zoomResetKey: string,
  scrollResetKey: string,
) {
  const [zoom, setZoom] = useState(1)
  const pointsRef = useRef(new Map<number, Point>())
  const pinchRef = useRef<PinchStart | null>(null)
  const refs = { viewport: viewportRef, points: pointsRef, pinch: pinchRef }

  useEffect(() => {
    setZoom(1)
  }, [zoomResetKey])

  useEffect(() => {
    viewportRef.current?.scrollTo(0, 0)
  }, [scrollResetKey, zoomResetKey, viewportRef])

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) =>
    startPinch(event, refs, zoom)
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) =>
    movePinch(event, refs, setZoom)
  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) =>
    endPinch(event, refs)

  return {
    zoom,
    zoomIn: () => setZoom((current) => clampPdfZoom(current + 0.25)),
    zoomOut: () => setZoom((current) => clampPdfZoom(current - 0.25)),
    resetZoom: () => setZoom(1),
    pointerHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
    },
  }
}
