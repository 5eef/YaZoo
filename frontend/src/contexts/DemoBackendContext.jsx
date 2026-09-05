import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PropTypes from 'prop-types'

import { DemoBackendContext } from './demo-backend-context'
import { pollDemoBackend } from '../lib/demoBackendPolling'

export function DemoBackendProvider({ children }) {
  const [status, setStatus] = useState('checking')
  const [retryKey, setRetryKey] = useState(0)
  const sequenceRef = useRef(0)

  const retry = useCallback(() => {
    sequenceRef.current += 1
    setStatus('checking')
    setRetryKey((current) => current + 1)
  }, [])

  useEffect(() => {
    const sequence = sequenceRef.current
    const controller = new AbortController()
    const initialTimerId = globalThis.setTimeout(() => {
      void pollDemoBackend({
        signal: controller.signal,
        onStatus: (nextStatus) => {
          if (sequenceRef.current === sequence) {
            setStatus(nextStatus)
          }
        },
      })
    }, 0)

    return () => {
      globalThis.clearTimeout(initialTimerId)
      controller.abort()
    }
  }, [retryKey])

  const value = useMemo(() => ({ status, retry }), [retry, status])

  return (
    <DemoBackendContext.Provider value={value}>
      {children}
    </DemoBackendContext.Provider>
  )
}

DemoBackendProvider.propTypes = {
  children: PropTypes.node,
}
