import { useState } from 'react'
import type { RegisterSWOptions } from 'vite-plugin-pwa/types'

export function useRegisterSW(_options?: RegisterSWOptions) {
  const needRefresh = useState(false)
  const offlineReady = useState(false)
  return {
    needRefresh,
    offlineReady,
    updateServiceWorker: async () => undefined,
  }
}
