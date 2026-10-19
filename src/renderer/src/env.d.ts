/// <reference types="vite/client" />

import type { CopilotBridge } from '../../shared/bridge'

declare global {
  interface Window {
    copilot?: CopilotBridge
  }
}

export {}
