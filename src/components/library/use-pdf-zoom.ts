import { useEffect, useRef, useState } from 'react'
import type {
  Dispatch,
  PointerEvent as ReactPointerEvent,
  RefObject,
  SetStateAction,
} from 'react'
import type { PdfGesture } from '@/components/library/pdf-viewer.gesture.domain'
import {
  clampPdfZoom,
  resolvePdfPinchZoom,
} from '@/components/library/pdf-viewer.domain'
import { classifyPdfGesture } from '@/components/library/pdf-viewer.gesture.domain'

type Point = { x: number; y: number }
type PinchStart = {
  distance: number
  zoom: number
  focusX: number
  focusY: number
}
type TapSwipeStart = {
  pointerId: number
  startX: number
  startY: number
  startTime: number
  cancelled: boolean
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
  tapSwipe: RefObject<TapSwipeStart | null>
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
  if (refs.points.current.size === 0) {
    refs.tapSwipe.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startTime: event.timeStamp,
      cancelled: false,
    }
  } else if (refs.tapSwipe.current) {
    // A second finger joined: the gesture belongs to pinch/zoom now.
    refs.tapSwipe.current.cancelled = true
  }
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

function classifyEndGesture(
  event: ReactPointerEvent<HTMLDivElement>,
  tapSwipe: TapSwipeStart,
  zoom: number,
  onGesture: ((gesture: PdfGesture) => void) | undefined,
) {
  if (tapSwipe.cancelled || tapSwipe.pointerId !== event.pointerId) return
  const gesture = classifyPdfGesture({
    pointerCount: 1,
    startX: tapSwipe.startX,
    startY: tapSwipe.startY,
    endX: event.clientX,
    endY: event.clientY,
    durationMs: event.timeStamp - tapSwipe.startTime,
    zoom,
  })
  if (gesture) onGesture?.(gesture)
}

function endPinch(
  event: ReactPointerEvent<HTMLDivElement>,
  refs: GestureRefs,
  zoom: number,
  onGesture: ((gesture: PdfGesture) => void) | undefined,
  classify: boolean,
) {
  const tapSwipe = refs.tapSwipe.current
  if (classify && tapSwipe) classifyEndGesture(event, tapSwipe, zoom, onGesture)
  if (tapSwipe?.pointerId === event.pointerId) refs.tapSwipe.current = null
  refs.points.current.delete(event.pointerId)
  if (refs.points.current.size < 2) refs.pinch.current = null
}

export function usePdfZoom(
  viewportRef: RefObject<HTMLDivElement | null>,
  zoomResetKey: string,
  scrollResetKey: string,
  onGesture?: (gesture: PdfGesture) => void,
) {
  const [zoom, setZoom] = useState(1)
  const pointsRef = useRef(new Map<number, Point>())
  const pinchRef = useRef<PinchStart | null>(null)
  const tapSwipeRef = useRef<TapSwipeStart | null>(null)
  const refs = {
    viewport: viewportRef,
    points: pointsRef,
    pinch: pinchRef,
    tapSwipe: tapSwipeRef,
  }

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
    endPinch(event, refs, zoom, onGesture, true)
  const onPointerCancel = (event: ReactPointerEvent<HTMLDivElement>) =>
    endPinch(event, refs, zoom, onGesture, false)

  return {
    zoom,
    zoomIn: () => setZoom((current) => clampPdfZoom(current + 0.25)),
    zoomOut: () => setZoom((current) => clampPdfZoom(current - 0.25)),
    resetZoom: () => setZoom(1),
    pointerHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel,
    },
  }
}
