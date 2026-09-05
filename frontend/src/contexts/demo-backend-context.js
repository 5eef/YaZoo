import { createContext } from 'react'

export const DEFAULT_DEMO_BACKEND_CONTEXT = Object.freeze({
  status: 'ready',
  retry: () => {},
})

export const DemoBackendContext = createContext(DEFAULT_DEMO_BACKEND_CONTEXT)
