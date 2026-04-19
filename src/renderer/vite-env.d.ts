/// <reference types="vite/client" />

import type { PulseditApi } from '@shared/ipc'

declare global {
  interface Window {
    pulsedit: PulseditApi
  }
}

export {}
