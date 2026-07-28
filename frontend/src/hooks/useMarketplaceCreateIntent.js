import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router'

export function useMarketplaceCreateIntent({
  onOpen,
  onServiceType,
} = {}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const panelRef = useRef(null)
  const focusTimerRef = useRef(null)

  useEffect(() => () => {
    if (focusTimerRef.current) {
      globalThis.clearTimeout(focusTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (searchParams.get('create') !== '1') {
      return
    }

    const requestedType = searchParams.get('type')
    onOpen?.()

    if (requestedType === 'training') {
      onServiceType?.('training')
    }

    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.delete('create')
    nextSearchParams.delete('type')
    setSearchParams(nextSearchParams, { replace: true })

    focusTimerRef.current = globalThis.setTimeout(() => {
      const panel = panelRef.current
      const prefersReducedMotion = globalThis.matchMedia?.(
        '(prefers-reduced-motion: reduce)',
      ).matches

      panel?.scrollIntoView?.({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'start',
      })
      panel
        ?.querySelector('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])')
        ?.focus({ preventScroll: true })
      focusTimerRef.current = null
    }, 0)
  }, [onOpen, onServiceType, searchParams, setSearchParams])

  return panelRef
}
