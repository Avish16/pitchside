/// <reference types="vite/client" />

import type { PitchsideBridge } from '@pitchside/shared'

declare global {
  interface Window {
    pitchside?: PitchsideBridge
  }
}

export {}
