import { useEffect, useRef } from 'react'

// Read-only refreshes: one request cycle at a time, paused in hidden tabs.
export function useVisiblePolling(refresh, { enabled = true, intervalMs = 30000 } = {}) {
  const callback = useRef(refresh)
  useEffect(() => { callback.current = refresh }, [refresh])
  useEffect(() => {
    if (!enabled) return undefined
    const interval = Math.max(5000, intervalMs)
    let disposed = false
    let running = false
    let timer
    let failures = 0
    let lastStart = Date.now()
    const visible = () => document.visibilityState !== 'hidden'
    const schedule = () => {
      clearTimeout(timer)
      if (!disposed && !running && visible()) {
        const delay = Math.min(interval * (2 ** failures), 120000)
        timer = setTimeout(tick, Math.max(0, delay - (Date.now() - lastStart)))
      }
    }
    async function tick() {
      if (disposed || running || !visible()) return
      running = true
      lastStart = Date.now()
      try { await callback.current(); failures = 0 } catch { failures = Math.min(failures + 1, 3) }
      finally { running = false; schedule() }
    }
    document.addEventListener('visibilitychange', schedule)
    schedule()
    return () => { disposed = true; clearTimeout(timer); document.removeEventListener('visibilitychange', schedule) }
  }, [enabled, intervalMs])
}
