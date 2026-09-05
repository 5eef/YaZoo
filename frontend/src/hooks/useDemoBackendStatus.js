import { useContext } from 'react'

import { DemoBackendContext } from '../contexts/demo-backend-context'

export function useDemoBackendStatus() {
  return useContext(DemoBackendContext)
}
